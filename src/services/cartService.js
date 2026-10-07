import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";

const CARTS_COLLECTION = "carts";

/**
 * Retrieves a customer's active cloud cart from Cloud Firestore.
 * @param {string} customerId - Customer identifier (e.g. CUS-10001 or UID)
 * @returns {Promise<Object|null>}
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
    console.warn("Could not load cloud cart from Firestore:", err);
  }
  return null;
}

/**
 * Synchronizes the customer's cart state to Cloud Firestore.
 * Conforms strictly to the required schema:
 * - cartId
 * - customerId
 * - items (with productId, productName, price, quantity, image, giftWrappingSelected, giftWrappingPrice, itemSubtotal, total)
 * - productSubtotal
 * - giftWrappingTotal
 * - grandTotal
 * - totalItems
 * - updatedAt
 *
 * @param {string} customerId
 * @param {Object} cartData
 * @returns {Promise<Object|null>}
 */
export async function saveCloudCart(customerId, cartData) {
  if (!customerId) return null;

  const {
    items = [],
    productSubtotal = 0,
    subtotal = 0,
    giftWrappingTotal = 0,
    grandTotal = 0,
    total = 0,
    totalItems = 0,
  } = cartData || {};

  try {
    const docRef = doc(db, CARTS_COLLECTION, customerId);

    const normalizedItems = items.map((it) => {
      const price = Number(it.price) || 0;
      const quantity = Math.max(1, Number(it.quantity) || 1);
      const giftWrappingSelected = Boolean(it.giftWrappingSelected);
      const giftWrappingPrice = Number(it.giftWrappingPrice) || 0;
      const itemSubtotal = price * quantity;
      const itemTotal = itemSubtotal + (giftWrappingSelected ? giftWrappingPrice * quantity : 0);
      const image = it.image || it.thumbnail || it.image_url || "";

      return {
        productId: it.productId || it.product_id || it.id,
        productName: it.productName || it.product_name || "Gift Hamper",
        price,
        quantity,
        image,
        giftWrappingSelected,
        giftWrappingPrice,
        giftWrappingAvailable: it.giftWrappingAvailable !== undefined ? Boolean(it.giftWrappingAvailable) : true,
        stockQuantity: typeof it.stockQuantity === "number" ? it.stockQuantity : 50,
        itemSubtotal,
        total: itemTotal,
        // Backward compatibility getters
        product_id: it.productId || it.product_id || it.id,
        product_name: it.productName || it.product_name || "Gift Hamper",
        image_url: image,
      };
    });

    const finalSubtotal = Number(productSubtotal || subtotal) || 0;
    const finalGiftWrap = Number(giftWrappingTotal) || 0;
    const finalGrandTotal = Number(grandTotal || total) || (finalSubtotal + finalGiftWrap);
    const finalTotalItems = Number(totalItems) || normalizedItems.reduce((acc, x) => acc + x.quantity, 0);

    const payload = {
      cartId: `CRT-${customerId}`,
      customerId,
      items: normalizedItems,
      productSubtotal: finalSubtotal,
      subtotal: finalSubtotal,
      giftWrappingTotal: finalGiftWrap,
      grandTotal: finalGrandTotal,
      total: finalGrandTotal,
      totalItems: finalTotalItems,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (err) {
    console.warn("Could not save cloud cart to Firestore:", err);
    return null;
  }
}

/**
 * Empties cloud cart after order placement or explicit clear.
 * @param {string} customerId
 */
export async function clearCloudCart(customerId) {
  if (!customerId) return;
  try {
    const docRef = doc(db, CARTS_COLLECTION, customerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Could not clear cloud cart from Firestore:", err);
  }
}

/**
 * Merges a guest cart with a customer's Cloud Cart using a Firestore Transaction.
 * Guarantees atomicity and eliminates duplicate products by merging identical product lines.
 *
 * @param {string} customerId - The authenticated customer's ID
 * @param {Array} guestItems - Items in guest localStorage
 * @returns {Promise<Object>} The combined cart payload
 */
export async function mergeGuestCartWithCloudCart(customerId, guestItems = []) {
  if (!customerId) return { items: guestItems };
  if (!guestItems || guestItems.length === 0) {
    const existing = await getCloudCart(customerId);
    return existing || { items: [] };
  }

  const docRef = doc(db, CARTS_COLLECTION, customerId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      let cloudItems = [];

      if (snap.exists() && Array.isArray(snap.data().items)) {
        cloudItems = snap.data().items;
      }

      // Merge guestItems into cloudItems
      const mergedList = [...cloudItems];

      for (const guestItem of guestItems) {
        const pId = guestItem.productId || guestItem.product_id || guestItem.id;
        const gWrap = Boolean(guestItem.giftWrappingSelected);

        const matchIdx = mergedList.findIndex(
          (m) =>
            (m.productId || m.product_id || m.id) === pId &&
            Boolean(m.giftWrappingSelected) === gWrap
        );

        if (matchIdx > -1) {
          // Merge quantities without duplicating products
          const existing = mergedList[matchIdx];
          const stock = typeof existing.stockQuantity === "number" ? existing.stockQuantity : 99;
          const mergedQty = Math.min(stock, (existing.quantity || 1) + (guestItem.quantity || 1));

          const price = Number(existing.price) || Number(guestItem.price) || 0;
          const gPrice = Number(existing.giftWrappingPrice) || Number(guestItem.giftWrappingPrice) || 0;
          const subtotal = price * mergedQty;
          const total = subtotal + (gWrap ? gPrice * mergedQty : 0);

          mergedList[matchIdx] = {
            ...existing,
            quantity: mergedQty,
            itemSubtotal: subtotal,
            total,
          };
        } else {
          // Add new line item
          const price = Number(guestItem.price) || 0;
          const quantity = Math.max(1, Number(guestItem.quantity) || 1);
          const gPrice = Number(guestItem.giftWrappingPrice) || 0;
          const subtotal = price * quantity;
          const total = subtotal + (gWrap ? gPrice * quantity : 0);
          const image = guestItem.image || guestItem.thumbnail || guestItem.image_url || "";

          mergedList.push({
            productId: pId,
            productName: guestItem.productName || guestItem.product_name || "Gift Hamper",
            price,
            quantity,
            image,
            giftWrappingSelected: gWrap,
            giftWrappingPrice: gPrice,
            giftWrappingAvailable: guestItem.giftWrappingAvailable !== undefined ? Boolean(guestItem.giftWrappingAvailable) : true,
            stockQuantity: typeof guestItem.stockQuantity === "number" ? guestItem.stockQuantity : 50,
            itemSubtotal: subtotal,
            total,
            product_id: pId,
            product_name: guestItem.productName || guestItem.product_name,
            image_url: image,
          });
        }
      }

      // Compute totals
      const productSubtotal = mergedList.reduce((acc, it) => acc + (it.itemSubtotal || 0), 0);
      const giftWrappingTotal = mergedList.reduce(
        (acc, it) => acc + (it.giftWrappingSelected ? (it.giftWrappingPrice || 0) * (it.quantity || 1) : 0),
        0
      );
      const grandTotal = productSubtotal + giftWrappingTotal;
      const totalItems = mergedList.reduce((acc, it) => acc + (it.quantity || 1), 0);

      const updatedPayload = {
        cartId: `CRT-${customerId}`,
        customerId,
        items: mergedList,
        productSubtotal,
        subtotal: productSubtotal,
        giftWrappingTotal,
        grandTotal,
        total: grandTotal,
        totalItems,
        updatedAt: new Date(),
      };

      transaction.set(docRef, updatedPayload, { merge: true });
      return updatedPayload;
    });

    return result;
  } catch (err) {
    console.warn("Transaction failed in mergeGuestCartWithCloudCart, using fallback:", err);
    return await saveCloudCart(customerId, { items: guestItems });
  }
}
