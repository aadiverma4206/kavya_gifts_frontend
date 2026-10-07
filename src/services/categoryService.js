import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getActiveProducts } from "./productService";

const CATEGORIES_COLLECTION = "categories";

/**
 * Retrieves category names. First checks the "categories" collection
 * for active categories. If empty, falls back dynamically to unique
 * categories from active products.
 */
export async function getActiveCategories() {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const names = snapshot.docs
        .map((docSnap) => docSnap.data().name)
        .filter(Boolean);
      if (names.length > 0) {
        return [...new Set(names)];
      }
    }
  } catch (err) {
    console.warn("Could not query categories collection, falling back to products:", err);
  }

  // Dynamic fallback from active products
  const products = await getActiveProducts();
  return [...new Set(products.map((p) => p.category))].filter(Boolean);
}
