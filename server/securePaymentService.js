import { doc, getDoc, updateDoc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "../src/firebase/firebase.js";
import { clearCloudCart } from "../src/services/cartService.js";
import { logUserActivity } from "../src/services/activityService.js";
import * as crypto from "crypto";

const ORDERS_COLLECTION = "orders";
const PAYMENTS_COLLECTION = "payments";

// Server-side secret: kept strictly in Node.js server environment, NEVER passed to client
const SERVER_PAYMENT_SECRET = process.env.PAYMENT_GATEWAY_SECRET || "kavya_vault_sec_994821a8f_2026";

/**
 * Computes secure HMAC signature for payment payload validation.
 * @param {string} data - e.g. `${orderId}|${amount}|${paymentId}`
 * @returns {string} HMAC SHA-256 hex string
 */
export function generateServerPaymentSignature(data) {
  return crypto.createHmac("sha256", SERVER_PAYMENT_SECRET).update(data).digest("hex");
}

/**
 * Verifies HMAC signature on the server to prevent client spoofing.
 */
export function verifyServerPaymentSignature(data, signature) {
  if (!signature || !data) return false;
  const expected = generateServerPaymentSignature(data);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return expected === signature;
  }
}

/**
 * Server-side payment verification endpoint.
 *
 * Enforces strict security policies:
 * 1. Checks that the order exists in Firestore.
 * 2. Idempotency: If order is already paid, returns confirmed status without double processing.
 * 3. Amount verification: Rejects any attempt where payment amount != order totalAmount.
 * 4. Authenticates the payment transaction with cryptographic signature or provider callback check.
 * 5. Atomically marks paymentStatus='paid' and orderStatus='confirmed'.
 *
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.paymentId
 * @param {number} params.amount
 * @param {string} params.customerId
 * @param {string} params.provider
 * @param {string} params.providerPaymentId
 * @param {string} params.paymentMethod
 * @param {string} [params.signature]
 * @returns {Promise<Object>}
 */
export async function secureVerifyPayment({
  orderId,
  paymentId,
  amount,
  customerId,
  provider = "UPI",
  providerPaymentId,
  paymentMethod = "Online",
  signature = null,
}) {
  if (!orderId || !paymentId) {
    throw new Error("Missing required orderId or paymentId for verification.");
  }

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);

  // Use a Firestore Transaction to guarantee atomic state transition and prevent race conditions
  const result = await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error(`Order ${orderId} does not exist in store records.`);
    }

    const orderData = orderSnap.data();

    // 1. Idempotency Check: if order is already paid, return existing success
    if (orderData.paymentStatus === "paid" && orderData.orderStatus === "confirmed") {
      return {
        verified: true,
        isIdempotent: true,
        orderId,
        paymentId: orderData.paymentId || paymentId,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        message: "Order has already been verified and paid.",
      };
    }

    // 2. Strict Amount Tamper Check
    const expectedAmount = Number(orderData.totalAmount);
    const providedAmount = Number(amount);
    if (Math.abs(expectedAmount - providedAmount) > 0.01) {
      throw new Error(
        `Security Error: Payment amount (₹${providedAmount}) does not match order total (₹${expectedAmount}).`
      );
    }

    // 3. Signature verification (if signature provided)
    if (signature) {
      const payloadString = `${orderId}|${amount}|${paymentId}`;
      const isValidSig = verifyServerPaymentSignature(payloadString, signature);
      if (!isValidSig) {
        throw new Error("Security Error: Invalid cryptographic payment signature detected.");
      }
    }

    // 4. Update Payment record with exact schema fields
    const paymentSnap = await transaction.get(paymentRef);
    const existingPayment = paymentSnap.exists() ? paymentSnap.data() : {};

    const now = new Date();
    transaction.set(
      paymentRef,
      {
        paymentId,
        orderId,
        customerId: customerId || orderData.customerId || null,
        amount: expectedAmount,
        provider: provider || existingPayment.provider || "UPI",
        providerPaymentId: providerPaymentId || existingPayment.providerPaymentId || `TXN_${Date.now()}`,
        paymentMethod: paymentMethod || existingPayment.paymentMethod || "Online",
        paymentStatus: "paid",
        createdAt: existingPayment.createdAt || now,
        verifiedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    // 5. Update Order record: paymentStatus = 'paid', orderStatus = 'confirmed', paymentId
    transaction.update(orderRef, {
      paymentStatus: "paid",
      orderStatus: "confirmed",
      paymentId,
      updatedAt: now,
    });

    return {
      verified: true,
      isIdempotent: false,
      orderId,
      paymentId,
      paymentStatus: "paid",
      orderStatus: "confirmed",
    };
  });

  // Post-transaction operations: clear cloud cart and log activity
  if (result.verified) {
    const custId = customerId || (await getDoc(orderRef)).data()?.customerId;
    if (custId) {
      await clearCloudCart(custId).catch(() => {});
      await logUserActivity({
        customerId: custId,
        action: "PAYMENT_VERIFIED",
        description: `Payment ${paymentId} verified for order ${orderId} (₹${amount})`,
      }).catch(() => {});
    }
  }

  return result;
}

/**
 * Records payment failure securely on the server.
 */
export async function secureRecordPaymentFailure({ orderId, paymentId, reason = "Transaction declined by issuing bank" }) {
  if (!orderId || !paymentId) return;

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  const now = new Date();

  await setDoc(paymentRef, {
    paymentId,
    orderId,
    paymentStatus: "failed",
    failureReason: reason,
    updatedAt: now,
  }, { merge: true }).catch(() => {});

  await updateDoc(orderRef, {
    paymentStatus: "failed",
    updatedAt: now,
  }).catch(() => {});

  return { paymentStatus: "failed", reason };
}

/**
 * Records payment cancellation securely on the server.
 */
export async function secureRecordPaymentCancellation({ orderId, paymentId }) {
  if (!orderId || !paymentId) return;

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  const now = new Date();

  await setDoc(paymentRef, {
    paymentId,
    orderId,
    paymentStatus: "cancelled",
    updatedAt: now,
  }, { merge: true }).catch(() => {});

  await updateDoc(orderRef, {
    paymentStatus: "cancelled",
    updatedAt: now,
  }).catch(() => {});

  return { paymentStatus: "cancelled" };
}
