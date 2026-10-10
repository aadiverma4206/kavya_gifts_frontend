/**
 * History Controller
 * Consolidates customer history retrieval:
 * 1. Order History
 * 2. Payment History
 * 3. Review History
 * 4. Activity History
 *
 * Uses efficient Firestore queries indexed by customerId.
 * Guarantees privacy: Never exposes another customer's private information.
 */

import { getOrdersByCustomer } from "../services/orderService.js";
import { getPaymentsByCustomer } from "../services/paymentService.js";
import { getCustomerReviews } from "../services/reviewService.js";
import { getCustomerActivity } from "../services/activityService.js";

function safeToDate(input) {
  if (!input) return new Date();
  if (typeof input.toDate === "function") return input.toDate();
  if (typeof input === "object" && typeof input.seconds === "number") {
    return new Date(input.seconds * 1000);
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Loads order history for a customer with formatted fields.
 */
export async function getCustomerOrderHistory(customerIdOrUid) {
  if (!customerIdOrUid) return [];
  const rawOrders = await getOrdersByCustomer(customerIdOrUid);

  return rawOrders.map((ord) => ({
    orderId: ord.orderId,
    date: safeToDate(ord.createdAt),
    products: (ord.items || []).map((it) => ({
      productId: it.productId || it.product_id,
      productName: it.productName || it.product_name,
      price: it.price,
      quantity: it.quantity,
      image: it.image || it.image_url || it.thumbnail,
      giftWrappingSelected: it.giftWrappingSelected,
      subtotal: it.subtotal || it.itemSubtotal || it.price * it.quantity,
    })),
    total: ord.totalAmount || ord.total || 0,
    subtotal: ord.subtotal || 0,
    giftWrappingTotal: ord.giftWrappingTotal || ord.giftWrapFee || 0,
    paymentStatus: ord.paymentStatus || "pending",
    orderStatus: ord.orderStatus || "pending",
    deliveryAddress: ord.deliveryAddress || ord.customerSnapshot?.address || "",
    customerSnapshot: ord.customerSnapshot || {},
    giftWrap: ord.giftWrap || null,
    paymentMethod: ord.paymentMethod || "Online",
    paymentId: ord.paymentId || null,
  }));
}

/**
 * Loads payment history for a customer with formatted fields.
 */
export async function getCustomerPaymentHistory(customerId) {
  if (!customerId) return [];
  const rawPayments = await getPaymentsByCustomer(customerId);

  return rawPayments.map((p) => ({
    paymentId: p.paymentId,
    orderId: p.orderId,
    amount: p.amount,
    method: p.paymentMethod || p.method || "Online",
    provider: p.provider || "UPI",
    providerPaymentId: p.providerPaymentId || null,
    status: p.paymentStatus || p.status || "pending",
    date: safeToDate(p.createdAt),
    verifiedAt: p.verifiedAt ? safeToDate(p.verifiedAt) : null,
  }));
}

/**
 * Loads review history for a customer with formatted fields.
 */
export async function getCustomerReviewHistory(customerId) {
  if (!customerId) return [];
  const rawReviews = await getCustomerReviews(customerId);

  return rawReviews.map((r) => ({
    reviewId: r.reviewId,
    productId: r.productId,
    product: r.productName || r.productId,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    status: r.status || "approved",
    date: safeToDate(r.createdAt),
    updatedAt: r.updatedAt ? safeToDate(r.updatedAt) : null,
  }));
}

/**
 * Loads user activity audit history for a customer.
 */
export async function getCustomerActivityHistory(customerId) {
  if (!customerId) return [];
  const rawActivities = await getCustomerActivity(customerId);

  return rawActivities.map((a) => ({
    activityId: a.activityId || a.id,
    action: a.action || "EVENT",
    description: a.description || "",
    date: safeToDate(a.createdAt),
  }));
}

/**
 * Aggregates all 4 histories in parallel for the Customer Dashboard.
 */
export async function loadFullCustomerDashboardHistory(customerId, userId) {
  const targetId = customerId || userId;
  if (!targetId) {
    return { orders: [], payments: [], reviews: [], activities: [] };
  }

  const [orders, payments, reviews, activities] = await Promise.all([
    getCustomerOrderHistory(targetId),
    customerId ? getCustomerPaymentHistory(customerId) : Promise.resolve([]),
    customerId ? getCustomerReviewHistory(customerId) : Promise.resolve([]),
    customerId ? getCustomerActivityHistory(customerId) : Promise.resolve([]),
  ]);

  return {
    orders,
    payments,
    reviews,
    activities,
  };
}
