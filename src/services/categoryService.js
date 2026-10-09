import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { getActiveProducts } from "./productService.js";

const CATEGORIES_COLLECTION = "categories";

function generateSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapCategoryDoc(docSnap) {
  const data = docSnap.data();
  const categoryName = data.categoryName || data.name || "";
  const slug = data.slug || generateSlug(categoryName);
  const categoryId = data.categoryId || docSnap.id;

  return {
    id: docSnap.id,
    categoryId,
    categoryName,
    slug,
    description: data.description || "",
    image: data.image || "",
    status: data.status || "active",
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    // Backward compatibility
    name: categoryName,
  };
}

/**
 * Retrieves category names for storefront navigation. First checks the
 * "categories" collection for active categories sorted by sortOrder. If empty,
 * falls back dynamically to unique categories from active products.
 */
export async function getActiveCategories() {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cats = snapshot.docs.map(mapCategoryDoc);
      cats.sort((a, b) => a.sortOrder - b.sortOrder);
      const names = cats.map((c) => c.categoryName).filter(Boolean);
      try {
        const products = await getActiveProducts();
        const prodCats = products.map((p) => p.categoryName || p.category).filter(Boolean);
        return [...new Set([...names, ...prodCats])];
      } catch (_) {
        if (names.length > 0) {
          return [...new Set(names)];
        }
      }
    }
  } catch (err) {
    console.warn("Could not query categories collection, falling back to products:", err);
  }

  // Dynamic fallback from active products
  const products = await getActiveProducts();
  return [...new Set(products.map((p) => p.categoryName || p.category))].filter(Boolean);
}

/**
 * Owner portal: Retrieves all category documents with full schema.
 */
export async function getAllCategoriesForOwner() {
  const snapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
  if (snapshot.empty) {
    const products = await getActiveProducts();
    const unique = [...new Set(products.map((p) => p.categoryName || p.category))].filter(Boolean);
    return unique.map((name, i) => ({
      id: `CAT-${10001 + i}`,
      categoryId: `CAT-${10001 + i}`,
      categoryName: name,
      slug: generateSlug(name),
      description: `Artisan hampers for ${name}`,
      image: "",
      status: "active",
      sortOrder: i + 1,
      name,
    }));
  }

  const list = snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map(mapCategoryDoc);
  return list.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Owner portal: Adds a new category with CAT-10001 sequence ID.
 */
export async function createCategory({
  categoryName,
  name,
  description = "",
  image = "",
  status = "active",
  sortOrder = 0,
}) {
  const rawName = categoryName || name || "";
  const cleanName = rawName.trim();
  const slug = generateSlug(cleanName);
  const categoryId = await getNextBusinessId("CAT");

  const docRef = doc(db, CATEGORIES_COLLECTION, slug || categoryId);

  const payload = {
    categoryId,
    categoryName: cleanName,
    slug,
    description: description.trim(),
    image: image.trim(),
    status,
    sortOrder: Number(sortOrder) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);
  return { id: docRef.id, ...payload, name: cleanName };
}

/**
 * Owner portal: Updates category details.
 */
export async function updateCategory(id, updates) {
  let docRef = doc(db, CATEGORIES_COLLECTION, id);
  let snap = await getDoc(docRef);
  if (!snap.exists()) {
    const q = query(collection(db, CATEGORIES_COLLECTION), where("categoryId", "==", id));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      docRef = querySnap.docs[0].ref;
    }
  }

  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (updates.categoryName) {
    payload.slug = generateSlug(updates.categoryName);
  } else if (updates.name && !updates.categoryName) {
    payload.categoryName = updates.name;
    payload.slug = generateSlug(updates.name);
  }
  if (updates.sortOrder !== undefined) {
    payload.sortOrder = Number(updates.sortOrder);
  }

  await updateDoc(docRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Owner portal: Deletes a category.
 */
export async function deleteCategory(id) {
  let docRef = doc(db, CATEGORIES_COLLECTION, id);
  let snap = await getDoc(docRef);
  if (!snap.exists()) {
    const q = query(collection(db, CATEGORIES_COLLECTION), where("categoryId", "==", id));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      docRef = querySnap.docs[0].ref;
    }
  }

  await deleteDoc(docRef);
  return { id, deleted: true };
}
