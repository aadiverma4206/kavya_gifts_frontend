import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { logUserActivity } from "./activityService.js";

const PAYMENTS_COLLECTION = "payments";

function mapPaymentDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    paymentId: data.paymentId || docSnap.id,
    orderId: data.orderId || "",
    customerId: data.customerId || null,
    amount: typeof data.amount === "number" ? data.amount : Number(data.amount) || 0,
    currency: data.currency || "INR",
    provider: data.provider || "Manual",
    providerPaymentId: data.providerPaymentId || null,
    paymentStatus: data.paymentStatus || data.status || "pending",
    paymentMethod: data.paymentMethod || data.method || "Online",
    createdAt: data.createdAt || null,
    verifiedAt: data.verifiedAt || null,

    // Backward compatibility aliases
    status: data.paymentStatus || data.status || "pending",
    method: data.paymentMethod || data.method || "Online",
  };
}

/**
 * Creates and records an initial payment transaction with exact schema fields.
 * Payment initially starts with:
 * paymentStatus = "pending"
 * verifiedAt = null
 */
export async function recordPayment({
  orderId,
  amount,
  method,
  paymentMethod,
  provider = "UPI",
  providerPaymentId = null,
  customerId = null,
  userId = null,
  paymentStatus = null,
  status = null,
}) {
  const paymentId = await getNextBusinessId("PAY");

  const finalMethod = paymentMethod || method || "Online";
  const finalStatus = paymentStatus || status || "pending";
  const finalCustomerId = customerId || userId || null;

  const paymentData = {
    paymentId,
    orderId,
    customerId: finalCustomerId,
    amount: Number(amount),
    provider: provider || "UPI",
    providerPaymentId: providerPaymentId || null,
    paymentMethod: finalMethod,
    paymentStatus: finalStatus,
    createdAt: serverTimestamp(),
    verifiedAt: finalStatus === "paid" ? serverTimestamp() : null,
  };

  const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  await setDoc(docRef, paymentData);

  // Log Activity
  if (finalCustomerId) {
    await logUserActivity({
      customerId: finalCustomerId,
      action: "PAYMENT_RECORDED",
      description: `Payment ${paymentId} for ₹${amount} initiated with status ${finalStatus}`,
    });
  }

  return {
    id: paymentId,
    ...paymentData,
    status: finalStatus,
    method: finalMethod,
  };
}

/**
 * Communicates with secure server to generate payment intent signature.
 */
export async function createPaymentIntent({ orderId, amount, paymentId }) {
  try {
    const res = await fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount, paymentId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create payment intent");
    }
    const data = await res.json();
    return data.signature;
  } catch (err) {
    console.warn("Server payment intent warning:", err.message);
    return null;
  }
}

/**
 * Communicates with secure server endpoint to verify payment and atomically confirm order.
 * NEVER trusts frontend success status. Server validates order total, payment signature,
 * updates Firestore atomically, and clears cart.
 */
export async function verifyPaymentOnServer({
  orderId,
  paymentId,
  amount,
  customerId,
  provider,
  providerPaymentId,
  paymentMethod,
  signature,
}) {
  const res = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      paymentId,
      amount,
      customerId,
      provider,
      providerPaymentId,
      paymentMethod,
      signature,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Payment verification failed on secure server.");
  }

  return data.result;
}

/**
 * Informs server of payment failure.
 */
export async function reportPaymentFailure({ orderId, paymentId, reason }) {
  try {
    const res = await fetch("/api/payments/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId, reason }),
    });
    return await res.json();
  } catch (err) {
    console.error("Failed to report payment failure to server:", err);
  }
}

/**
 * Informs server of payment cancellation.
 */
export async function reportPaymentCancellation({ orderId, paymentId }) {
  try {
    const res = await fetch("/api/payments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId }),
    });
    return await res.json();
  } catch (err) {
    console.error("Failed to report payment cancellation to server:", err);
  }
}

/**
 * Owner portal: Retrieves all payment records.
 */
export async function getAllPaymentsForOwner() {
  const snapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
  const payments = snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map(mapPaymentDoc);
  return payments.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Customer portal: Retrieves payments for a customer.
 */
export async function getPaymentsByCustomer(customerId) {
  if (!customerId) return [];
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where("customerId", "==", customerId)
  );
  const snapshot = await getDocs(q);
  const payments = snapshot.docs.map(mapPaymentDoc);
  return payments.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}
