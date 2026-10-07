import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

const CARTS_COLLECTION = "carts";

/**
 * Retrieves a customer's active cloud cart.
 */
export async function getCloudCart(customerId) {
  if (!customerId) return null;
  try {
    const docRef = doc(db, CARTS_COLLECTION, customerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn("Could not load cloud cart:", err);
  }
  return null;
}

/**
 * Synchronizes the customer's cart state to Cloud Firestore.
 */
export async function saveCloudCart(customerId, { items = [], subtotal = 0, giftWrappingTotal = 0, total = 0 }) {
  if (!customerId) return null;

  try {
    const docRef = doc(db, CARTS_COLLECTION, customerId);
    const payload = {
      cartId: `CRT-${customerId}`,
      customerId,
      items: items.map((it) => ({
        productId: it.productId || it.product_id || it.id,
        productName: it.productName || it.product_name,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
        thumbnail: it.thumbnail || it.image_url || "",
        giftWrapping: it.giftWrapping || null,
        subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 1),
      })),
      subtotal: Number(subtotal) || 0,
      giftWrappingTotal: Number(giftWrappingTotal) || 0,
      total: Number(total) || 0,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (err) {
    console.warn("Could not save cloud cart:", err);
    return null;
  }
}

/**
 * Empties cloud cart after order placement.
 */
export async function clearCloudCart(customerId) {
  if (!customerId) return;
  try {
    const docRef = doc(db, CARTS_COLLECTION, customerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Could not clear cloud cart:", err);
  }
}
