import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const PRODUCTS_COLLECTION = "products";

function mapProductDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    product_id: data.product_id || docSnap.id,
    product_name: data.product_name || "",
    category: data.category || "",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    image_url: data.image_url || "",
    stock_qty: typeof data.stock_qty === "number" ? data.stock_qty : Number(data.stock_qty) || 0,
    status: data.status || "active",
    description: data.description || "",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export async function getActiveProducts() {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapProductDoc);
}

export async function getProductsByCategory(categoryName) {
  if (!categoryName) return [];
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("category", "==", categoryName),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapProductDoc);
}

export async function getProductById(productId) {
  if (!productId) return null;

  // 1. Try directly fetching by document ID
  const directRef = doc(db, PRODUCTS_COLLECTION, productId);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    const product = mapProductDoc(directSnap);
    return product.status === "active" ? product : null;
  }

  // 2. Fallback: match by product_id field if doc ID differs
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("product_id", "==", productId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return mapProductDoc(snapshot.docs[0]);
  }

  return null;
}
