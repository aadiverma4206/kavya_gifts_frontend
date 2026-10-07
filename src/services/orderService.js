import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const ORDERS_COLLECTION = "orders";

/**
 * Generates an order identifier like ORD-1712491200000-4821
 */
export function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Creates a new order in Cloud Firestore.
 * Does NOT charge or implement fake payments.
 */
export async function createOrder({
  customer,
  items,
  subtotal,
  total,
  userId = null,
}) {
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Invalid order data: customer and items are required.");
  }

  const orderId = generateOrderId();

  // Store clean product snapshot in items array
  const sanitizedItems = items.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    price: Number(item.price),
    quantity: Number(item.quantity),
    subtotal: Number(item.price) * Number(item.quantity),
  }));

  const orderData = {
    orderId,
    userId: userId || null,
    customer: {
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    },
    items: sanitizedItems,
    subtotal: Number(subtotal),
    total: Number(total),
    orderStatus: "placed",
    paymentStatus: "pending",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);

  return {
    id: docRef.id,
    orderId,
    ...orderData,
  };
}

/**
 * Retrieves an order by orderId or document ID.
 */
export async function getOrderById(orderIdentifier) {
  if (!orderIdentifier) return null;

  // 1. Try document ID
  const directRef = doc(db, ORDERS_COLLECTION, orderIdentifier);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { id: directSnap.id, ...directSnap.data() };
  }

  // 2. Try orderId field
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where("orderId", "==", orderIdentifier)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
}
