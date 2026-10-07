/**
 * Payment Controller
 * Manages secure payment lifecycle, initial payment initiation,
 * server verification calls, error recovery (cancellation, failure, network error),
 * and retry flows.
 *
 * CRITICAL SECURITY:
 * NEVER trusts frontend success flags. Verification happens exclusively on the secure server.
 */

import {
  recordPayment,
  createPaymentIntent,
  verifyPaymentOnServer,
  reportPaymentFailure,
  reportPaymentCancellation,
} from "../services/paymentService.js";
import { getOrderById, updateOrderStatus } from "../services/orderService.js";

/**
 * Initiates an initial payment record in Firestore (paymentStatus = 'pending')
 * and generates a cryptographic payment intent signature from the server.
 */
export async function initiatePayment({
  orderId,
  amount,
  provider = "UPI",
  paymentMethod = "Online",
  customerId = null,
  userId = null,
}) {
  if (!orderId || !amount) {
    throw new Error("Order ID and amount are required to initiate payment.");
  }

  // 1. Create initial payment document in Firestore
  const paymentRecord = await recordPayment({
    orderId,
    amount,
    provider,
    paymentMethod,
    customerId,
    userId,
    paymentStatus: "pending",
  });

  // 2. Request HMAC payment intent signature from secure server
  let signature = null;
  try {
    signature = await createPaymentIntent({
      orderId,
      amount,
      paymentId: paymentRecord.paymentId,
    });
  } catch (err) {
    console.warn("Intent generation fallback:", err.message);
  }

  return {
    paymentId: paymentRecord.paymentId,
    orderId,
    amount,
    provider,
    paymentMethod,
    signature,
    paymentStatus: "pending",
  };
}

/**
 * Performs server-side verification of payment.
 * Ensures the order transitions atomically from pending -> paid / confirmed.
 *
 * @param {Object} params
 * @returns {Promise<Object>} Verification result from server
 */
export async function verifyPaymentTransaction({
  orderId,
  paymentId,
  amount,
  customerId,
  provider,
  providerPaymentId,
  paymentMethod,
  signature,
}) {
  try {
    const result = await verifyPaymentOnServer({
      orderId,
      paymentId,
      amount,
      customerId,
      provider,
      providerPaymentId,
      paymentMethod,
      signature,
    });

    return {
      success: true,
      verified: true,
      isIdempotent: Boolean(result.isIdempotent),
      orderId: result.orderId || orderId,
      paymentId: result.paymentId || paymentId,
      paymentStatus: "paid",
      orderStatus: "confirmed",
    };
  } catch (error) {
    // Distinguish network errors from validation rejections
    const isNetworkError =
      error.name === "TypeError" ||
      error.message?.includes("fetch") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError");

    return {
      success: false,
      isNetworkError,
      error: error.message || "Payment verification failed.",
      orderId,
      paymentId,
    };
  }
}

/**
 * Handles payment failure with recovery options.
 */
export async function handlePaymentFailure({ orderId, paymentId, reason }) {
  try {
    await reportPaymentFailure({
      orderId,
      paymentId,
      reason: reason || "Payment declined by provider",
    });
  } catch (err) {
    console.warn("Failed to report payment failure to server:", err);
  }

  return {
    paymentStatus: "failed",
    orderStatus: "failed",
    reason: reason || "Payment was declined.",
  };
}

/**
 * Handles user cancellation of payment.
 */
export async function handlePaymentCancellation({ orderId, paymentId }) {
  try {
    await reportPaymentCancellation({ orderId, paymentId });
  } catch (err) {
    console.warn("Failed to report payment cancellation to server:", err);
  }

  return {
    paymentStatus: "cancelled",
    orderStatus: "cancelled",
  };
}

/**
 * Re-initiates payment for an existing pending, failed, or cancelled order.
 */
export async function retryPaymentForOrder({
  orderId,
  provider = "UPI",
  paymentMethod = "Online",
  customerId = null,
  userId = null,
}) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error(`Cannot retry payment: Order ${orderId} does not exist.`);
  }

  if (order.paymentStatus === "paid" && order.orderStatus === "confirmed") {
    throw new Error(`Order ${orderId} is already paid and confirmed.`);
  }

  // Reset order status to pending for retry
  await updateOrderStatus(orderId, {
    orderStatus: "pending",
    paymentStatus: "pending",
  });

  return await initiatePayment({
    orderId,
    amount: order.totalAmount || order.total,
    provider,
    paymentMethod,
    customerId: customerId || order.customerId,
    userId: userId || order.userId,
  });
}
