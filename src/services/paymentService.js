import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getNextBusinessId } from "./sequenceService";
import { logUserActivity } from "./activityService";

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
 * Creates and records a payment transaction with exact schema fields.
 */
export async function recordPayment({
  orderId,
  amount,
  method,
  paymentMethod,
  provider = "UPI",
  providerPaymentId = null,
  userId = null,
  customerId = null,
  paymentStatus = "completed",
  status,
}) {
  const paymentId = await getNextBusinessId("PAY");

  const finalMethod = paymentMethod || method || "Online";
  const finalStatus = paymentStatus || status || "completed";

  const paymentData = {
    paymentId,
    orderId,
    customerId: customerId || null,
    amount: Number(amount),
    currency: "INR",
    provider: provider || "Manual",
    providerPaymentId: providerPaymentId || null,
    paymentStatus: finalStatus, // 'pending' | 'completed' | 'failed'
    paymentMethod: finalMethod,
    createdAt: serverTimestamp(),
    verifiedAt: finalStatus === "completed" ? serverTimestamp() : null,
  };

  const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
  await setDoc(docRef, paymentData);

  // Log Activity
  if (customerId) {
    await logUserActivity({
      customerId,
      action: "PAYMENT_RECORDED",
      description: `Payment ${paymentId} for ₹${amount} recorded with status ${finalStatus}`,
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
 * Owner portal: Retrieves all payment records.
 */
export async function getAllPaymentsForOwner() {
  const snapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
  const payments = snapshot.docs.map(mapPaymentDoc);
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
