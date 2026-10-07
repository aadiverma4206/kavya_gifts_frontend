/**
 * Order Controller
 * Manages order lifecycle, checkout idempotency, pending order tracking,
 * and order history retrieval.
 */

import {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
  findPendingOrderForCustomer,
  updateOrderDetails,
} from "../services/orderService.js";

/**
 * Initializes or reuses a pending order during checkout.
 * Enforces idempotency to prevent duplicate pending orders when
 * the customer navigates back and forth or refreshes.
 *
 * @param {Object} params
 * @param {Object} params.customer - { name, phone, email, address, deliveryDate, notes }
 * @param {Array} params.items - Cart items with all product & gift wrap fields
 * @param {number} params.subtotal
 * @param {Object} [params.giftWrap]
 * @param {number} [params.giftWrapFee]
 * @param {number} params.grandTotal
 * @param {string} [params.userId]
 * @param {string} [params.customerId]
 * @param {string} [params.existingOrderId] - If reusing in this session
 * @returns {Promise<Object>} The pending order object
 */
export async function initializeCheckoutOrder({
  customer,
  items,
  subtotal,
  giftWrap,
  giftWrapFee = 0,
  grandTotal,
  userId = null,
  customerId = null,
  existingOrderId = null,
}) {
  if (!items || items.length === 0) {
    throw new Error("Cannot create order with an empty cart.");
  }
  if (!customer?.name || !customer?.address || !customer?.phone) {
    throw new Error("Complete delivery details (name, address, phone) are required.");
  }

  // 1. If an existing pending order ID was passed, verify and reuse it
  if (existingOrderId) {
    const existing = await getOrderById(existingOrderId);
    if (existing && existing.orderStatus === "pending" && existing.paymentStatus === "pending") {
      // Update delivery address and totals in case they changed
      await updateOrderDetails(existingOrderId, {
        customerSnapshot: {
          name: customer.name,
          email: customer.email || "",
          mobile: customer.phone || customer.mobile || "",
          address: customer.address,
        },
        deliveryAddress: customer.address,
        subtotal,
        giftWrappingTotal: giftWrapFee,
        totalAmount: grandTotal,
      });

      return {
        ...existing,
        deliveryAddress: customer.address,
        subtotal,
        giftWrappingTotal: giftWrapFee,
        totalAmount: grandTotal,
        isReused: true,
      };
    }
  }

  // 2. Check if customer already has a pending order created recently
  if (customerId || userId) {
    const activePending = await findPendingOrderForCustomer(customerId || userId);
    if (activePending) {
      // Re-use this pending order by updating its details
      await updateOrderDetails(activePending.orderId, {
        customerSnapshot: {
          name: customer.name,
          email: customer.email || "",
          mobile: customer.phone || customer.mobile || "",
          address: customer.address,
        },
        deliveryAddress: customer.address,
        items,
        subtotal,
        giftWrappingTotal: giftWrapFee,
        totalAmount: grandTotal,
      });

      return {
        ...activePending,
        customerSnapshot: {
          name: customer.name,
          email: customer.email || "",
          mobile: customer.phone || customer.mobile || "",
          address: customer.address,
        },
        deliveryAddress: customer.address,
        items,
        subtotal,
        giftWrappingTotal: giftWrapFee,
        totalAmount: grandTotal,
        isReused: true,
      };
    }
  }

  // 3. Create fresh order in pending state
  const newOrder = await createOrder({
    customer: {
      name: customer.name,
      email: customer.email || "",
      mobile: customer.phone || customer.mobile || "",
      address: customer.address,
    },
    items,
    subtotal,
    giftWrap,
    giftWrappingTotal: giftWrapFee,
    totalAmount: grandTotal,
    userId,
    customerId,
    paymentStatus: "pending",
    orderStatus: "pending",
    paymentMethod: "Online",
  });

  return {
    ...newOrder,
    isReused: false,
  };
}

/**
 * Loads order confirmation details by ID.
 */
export async function getOrderConfirmationDetails(orderId) {
  if (!orderId) throw new Error("Order ID is required.");
  const order = await getOrderById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found.`);
  return order;
}

/**
 * Loads customer order history.
 */
export async function loadCustomerOrderHistory(customerIdOrUid) {
  if (!customerIdOrUid) return [];
  return await getOrdersByCustomer(customerIdOrUid);
}
