import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { logUserActivity } from "./activityService.js";

const ORDERS_COLLECTION = "orders";

function mapOrderDoc(docSnap) {
  const data = docSnap.data();
  const orderId = data.orderId || docSnap.id;
  const totalAmount = typeof data.totalAmount === "number" ? data.totalAmount : Number(data.total) || 0;
  const subtotal = typeof data.subtotal === "number" ? data.subtotal : 0;
  const giftWrappingTotal =
    typeof data.giftWrappingTotal === "number"
      ? data.giftWrappingTotal
      : typeof data.giftWrapFee === "number"
      ? data.giftWrapFee
      : 0;

  const customerSnapshot = data.customerSnapshot || {
    name: data.customer?.name || "",
    email: data.customer?.email || "",
    mobile: data.customer?.phone || data.customer?.mobile || "",
    address: data.customer?.address || data.deliveryAddress || "",
  };

  return {
    id: docSnap.id,
    orderId,
    customerId: data.customerId || null,
    customerSnapshot,
    items: data.items || [],
    subtotal,
    giftWrappingTotal,
    totalAmount,
    paymentId: data.paymentId || null,
    paymentStatus: data.paymentStatus || "pending",
    orderStatus: data.orderStatus || "placed",
    deliveryAddress: data.deliveryAddress || customerSnapshot.address || "",
    giftWrap: data.giftWrap || null,
    paymentMethod: data.paymentMethod || "Online",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    // Backward compatibility aliases
    total: totalAmount,
    giftWrapFee: giftWrappingTotal,
    customer: customerSnapshot,
    userId: data.userId || null,
  };
}

/**
 * Creates a new order conforming to the schema and logs customer activity.
 * Initial order is strictly:
 * paymentStatus = "pending"
 * orderStatus = "pending"
 */
export async function createOrder({
  customer,
  items,
  subtotal,
  giftWrap = null,
  giftWrappingTotal = 0,
  giftWrapFee = 0,
  total,
  totalAmount,
  userId = null,
  customerId = null,
  paymentId = null,
  paymentStatus = "pending",
  orderStatus = "pending",
  paymentMethod = "Online",
}) {
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Invalid order data: customer and items are required.");
  }

  const orderId = await getNextBusinessId("ORD");

  const finalGiftWrapTotal = Number(giftWrappingTotal || giftWrapFee) || 0;
  const finalSubtotal = Number(subtotal) || 0;
  const finalTotalAmount = Number(totalAmount || total) || (finalSubtotal + finalGiftWrapTotal);

  const customerSnapshot = {
    name: customer.name || "",
    email: customer.email || "",
    mobile: customer.mobile || customer.phone || "",
    address: customer.address || "",
  };

  const sanitizedItems = items.map((item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    const giftWrappingSelected = Boolean(item.giftWrappingSelected);
    const giftWrappingPrice = Number(item.giftWrappingPrice) || 0;
    const itemSubtotal = price * quantity;
    const itemTotal = itemSubtotal + (giftWrappingSelected ? giftWrappingPrice * quantity : 0);
    const img = item.image || item.image_url || item.thumbnail || "";

    return {
      productId: item.productId || item.product_id || item.id,
      productName: item.productName || item.product_name || "Gift Hamper",
      price,
      quantity,
      image: img,
      giftWrappingSelected,
      giftWrappingPrice,
      itemSubtotal,
      total: itemTotal,
      // Backward compatibility aliases
      thumbnail: img,
      image_url: img,
      product_id: item.productId || item.product_id || item.id,
      product_name: item.productName || item.product_name || "Gift Hamper",
      subtotal: itemSubtotal,
    };
  });

  const orderData = {
    orderId,
    customerId: customerId || null,
    userId: userId || null, // Firebase Auth reference for fast query
    customerSnapshot,
    items: sanitizedItems,
    subtotal: finalSubtotal,
    giftWrappingTotal: finalGiftWrapTotal,
    totalAmount: finalTotalAmount,
    paymentId: paymentId || null,
    paymentStatus: paymentStatus || "pending", // strictly 'pending' initially
    orderStatus: orderStatus || "pending",     // strictly 'pending' initially
    deliveryAddress: customerSnapshot.address,
    giftWrap: giftWrap
      ? {
          enabled: Boolean(giftWrap.enabled),
          optionId: giftWrap.optionId || "none",
          optionName: giftWrap.optionName || "Gift Wrap",
          message: giftWrap.message || "",
          recipientName: giftWrap.recipientName || "",
          fee: finalGiftWrapTotal,
        }
      : null,
    paymentMethod,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await setDoc(docRef, orderData);

  // Log activity
  if (customerId) {
    await logUserActivity({
      customerId,
      action: "ORDER_CREATED",
      description: `Order ${orderId} created for ₹${finalTotalAmount} (Status: pending)`,
    });
  }

  return {
    id: orderId,
    ...orderData,
    total: finalTotalAmount,
    giftWrapFee: finalGiftWrapTotal,
    customer: customerSnapshot,
  };
}

/**
 * Retrieves a customer's personal order history.
 */
export async function getOrdersByCustomer(customerIdOrUid) {
  if (!customerIdOrUid) return [];
  try {
    // 1. Try querying by customerId
    const qCust = query(
      collection(db, ORDERS_COLLECTION),
      where("customerId", "==", customerIdOrUid)
    );
    const snapCust = await getDocs(qCust);
    if (!snapCust.empty) {
      const orders = snapCust.docs.map(mapOrderDoc);
      return orders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    }

    // 2. Fallback query by userId
    const qUser = query(
      collection(db, ORDERS_COLLECTION),
      where("userId", "==", customerIdOrUid)
    );
    const snapUser = await getDocs(qUser);
    const orders = snapUser.docs.map(mapOrderDoc);
    return orders.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
}

/**
 * Retrieves an order by orderId.
 */
export async function getOrderById(orderId) {
  if (!orderId) return null;
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return mapOrderDoc(snap);
  }
  return null;
}

/**
 * Owner portal: Retrieves all orders across the system.
 */
export async function getAllOrdersForOwner() {
  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
  const orders = snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map(mapOrderDoc);
  return orders.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Finds an active pending order for a customer within the last 30 minutes to prevent duplicate orders.
 */
export async function findPendingOrderForCustomer(customerIdOrUid) {
  if (!customerIdOrUid) return null;
  try {
    const qCust = query(
      collection(db, ORDERS_COLLECTION),
      where("customerId", "==", customerIdOrUid),
      where("orderStatus", "==", "pending")
    );
    const snap = await getDocs(qCust);
    if (!snap.empty) {
      const orders = snap.docs.map(mapOrderDoc);
      // Return the most recent pending order
      orders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
      return orders[0];
    }
    return null;
  } catch (error) {
    console.warn("Could not check pending order:", error);
    return null;
  }
}

/**
 * Updates an order's delivery details or total (e.g. when reusing pending order).
 */
export async function updateOrderDetails(orderId, updates) {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const patch = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, patch);
  return { orderId, ...patch };
}

/**
 * Owner portal: Updates order fulfillment status or payment status.
 */
export async function updateOrderStatus(orderId, { orderStatus, paymentStatus, paymentId }) {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const updates = { updatedAt: serverTimestamp() };
  if (orderStatus) updates.orderStatus = orderStatus;
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (paymentId) updates.paymentId = paymentId;

  await updateDoc(docRef, updates);
  return { orderId, ...updates };
}
