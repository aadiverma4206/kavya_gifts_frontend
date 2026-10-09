import {
  collection,
  getDocs,
  doc,
  getDoc,
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
import {
  getDummyProducts,
  getDummyFeaturedProducts,
  getDummyProductsByCategory,
  getDummyProductById,
} from "../data/dummyProducts.js";

const PRODUCTS_COLLECTION = "products";

function generateSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes document snapshot to the complete products schema.
 * Also provides backward-compatible property getters (product_id, image_url, etc.).
 */
function mapProductDoc(docSnap) {
  const data = docSnap.data();
  const productId = data.productId || data.product_id || docSnap.id;
  const productName = data.productName || data.product_name || "";
  const price = typeof data.price === "number" ? data.price : Number(data.price) || 0;
  const stockQuantity =
    typeof data.stockQuantity === "number"
      ? data.stockQuantity
      : typeof data.stock_qty === "number"
      ? data.stock_qty
      : Number(data.stockQuantity || data.stock_qty) || 0;
  const thumbnail = data.thumbnail || data.image_url || (Array.isArray(data.images) && data.images[0]) || "";
  const images = Array.isArray(data.images) && data.images.length > 0 ? data.images : thumbnail ? [thumbnail] : [];
  const categoryName = data.categoryName || data.category || "General";
  const categoryId = data.categoryId || generateSlug(categoryName);

  return {
    id: docSnap.id,
    // Exact schema fields
    productId,
    productName,
    slug: data.slug || generateSlug(productName),
    categoryId,
    categoryName,
    description: data.description || "",
    shortDescription: data.shortDescription || (data.description ? data.description.substring(0, 100) : ""),
    price,
    stockQuantity,
    images,
    thumbnail,
    giftWrappingAvailable: data.giftWrappingAvailable !== undefined ? Boolean(data.giftWrappingAvailable) : true,
    giftWrappingPrice: typeof data.giftWrappingPrice === "number" ? data.giftWrappingPrice : 120,
    status: data.status || "active",
    featured: Boolean(data.featured),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    // Backward compatibility aliases
    product_id: productId,
    product_name: productName,
    image_url: thumbnail,
    stock_qty: stockQuantity,
    category: categoryName,
  };
}

/**
 * Public storefront: Retrieves active products (guaranteed 100+ hampers).
 */
export async function getActiveProducts() {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    const dbProducts = snapshot.docs.map(mapProductDoc);

    const dummyList = getDummyProducts();
    const existingIds = new Set(dbProducts.map((p) => p.productId || p.id));

    const merged = [...dbProducts];
    for (const item of dummyList) {
      if (!existingIds.has(item.productId)) {
        merged.push(item);
      }
    }

    return merged.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.warn("Could not query Firestore products, using dummy catalog:", err);
    return getDummyProducts();
  }
}

/**
 * Public storefront: Retrieves featured active products.
 */
export async function getFeaturedProducts() {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where("status", "==", "active"),
      where("featured", "==", true)
    );
    const snapshot = await getDocs(q);
    const dbFeatured = snapshot.docs.map(mapProductDoc);
    const dummyFeatured = getDummyFeaturedProducts();
    const existingIds = new Set(dbFeatured.map((p) => p.productId || p.id));
    const merged = [...dbFeatured];
    for (const item of dummyFeatured) {
      if (!existingIds.has(item.productId)) {
        merged.push(item);
      }
    }
    return merged;
  } catch (err) {
    console.warn("Could not query Firestore featured products, using dummy catalog:", err);
    return getDummyFeaturedProducts();
  }
}

/**
 * Public storefront: Retrieves active products by category name or categoryId.
 */
export async function getProductsByCategory(categoryIdentifier) {
  if (!categoryIdentifier) return [];

  try {
    // 1. Query by categoryName
    const qName = query(
      collection(db, PRODUCTS_COLLECTION),
      where("categoryName", "==", categoryIdentifier),
      where("status", "==", "active")
    );
    const snapName = await getDocs(qName);
    if (!snapName.empty) {
      const prods = snapName.docs.map(mapProductDoc);
      const dummyMatches = getDummyProductsByCategory(categoryIdentifier);
      const existingIds = new Set(prods.map((p) => p.productId || p.id));
      for (const item of dummyMatches) {
        if (!existingIds.has(item.productId)) prods.push(item);
      }
      return prods;
    }

    // 2. Fallback query by legacy "category" field
    const qLegacy = query(
      collection(db, PRODUCTS_COLLECTION),
      where("category", "==", categoryIdentifier),
      where("status", "==", "active")
    );
    const snapLegacy = await getDocs(qLegacy);
    if (!snapLegacy.empty) {
      return snapLegacy.docs.map(mapProductDoc);
    }

    // 3. Fallback query by categoryId
    const qId = query(
      collection(db, PRODUCTS_COLLECTION),
      where("categoryId", "==", categoryIdentifier),
      where("status", "==", "active")
    );
    const snapId = await getDocs(qId);
    if (!snapId.empty) {
      return snapId.docs.map(mapProductDoc);
    }

    return getDummyProductsByCategory(categoryIdentifier);
  } catch (err) {
    console.warn("Could not query category products, falling back to dummy list:", err);
    return getDummyProductsByCategory(categoryIdentifier);
  }
}

/**
 * Retrieves a single active product by productId, slug, or Firestore doc ID.
 */
export async function getProductById(productId) {
  if (!productId) return null;

  try {
    // 1. Fetch by direct document ID
    const directRef = doc(db, PRODUCTS_COLLECTION, productId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const product = mapProductDoc(directSnap);
      if (product.status === "active") return product;
    }

    // 2. Query by productId field
    const qId = query(
      collection(db, PRODUCTS_COLLECTION),
      where("productId", "==", productId),
      where("status", "==", "active")
    );
    const snapId = await getDocs(qId);
    if (!snapId.empty) {
      return mapProductDoc(snapId.docs[0]);
    }

    // 3. Query by legacy product_id
    const qLegacy = query(
      collection(db, PRODUCTS_COLLECTION),
      where("product_id", "==", productId),
      where("status", "==", "active")
    );
    const snapLegacy = await getDocs(qLegacy);
    if (!snapLegacy.empty) {
      return mapProductDoc(snapLegacy.docs[0]);
    }

    // 4. Query by slug
    const qSlug = query(
      collection(db, PRODUCTS_COLLECTION),
      where("slug", "==", productId),
      where("status", "==", "active")
    );
    const snapSlug = await getDocs(qSlug);
    if (!snapSlug.empty) {
      return mapProductDoc(snapSlug.docs[0]);
    }

    // 5. Fallback to dummy products
    return getDummyProductById(productId);
  } catch (err) {
    console.warn("Could not query Firestore product by ID, checking dummy catalog:", err);
    return getDummyProductById(productId);
  }
}

/**
 * Owner portal: Retrieves all products (both active and inactive).
 */
export async function getAllProductsForOwner() {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const products = snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map(mapProductDoc);
  return products.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Owner portal: Creates a new product with PRD-10001 sequence ID.
 */
export async function createProduct(productData) {
  const productId = await getNextBusinessId("PRD");
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);

  const productName = productData.productName || productData.product_name || "";
  const thumbnail = productData.thumbnail || productData.image_url || "";
  const images = Array.isArray(productData.images) && productData.images.length > 0 ? productData.images : thumbnail ? [thumbnail] : [];
  const categoryName = productData.categoryName || productData.category || "General";
  const categoryId = productData.categoryId || generateSlug(categoryName);

  const payload = {
    productId,
    productName,
    slug: generateSlug(productName),
    categoryId,
    categoryName,
    description: productData.description || "",
    shortDescription: productData.shortDescription || (productData.description ? productData.description.substring(0, 120) : ""),
    price: Number(productData.price) || 0,
    stockQuantity: Number(productData.stockQuantity || productData.stock_qty) || 0,
    images,
    thumbnail,
    giftWrappingAvailable: productData.giftWrappingAvailable !== undefined ? Boolean(productData.giftWrappingAvailable) : true,
    giftWrappingPrice: Number(productData.giftWrappingPrice) || 120,
    status: productData.status || "active",
    featured: Boolean(productData.featured),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);
  return { id: productId, ...payload, product_id: productId, product_name: productName, image_url: thumbnail, stock_qty: payload.stockQuantity };
}

/**
 * Owner portal: Updates an existing product.
 */
export async function updateProduct(id, updates) {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (updates.productName || updates.product_name) {
    const name = updates.productName || updates.product_name;
    payload.productName = name;
    payload.slug = generateSlug(name);
  }
  if (updates.price !== undefined) payload.price = Number(updates.price);
  if (updates.stockQuantity !== undefined || updates.stock_qty !== undefined) {
    payload.stockQuantity = Number(updates.stockQuantity !== undefined ? updates.stockQuantity : updates.stock_qty);
  }
  if (updates.image_url && !updates.thumbnail) {
    payload.thumbnail = updates.image_url;
  }
  if (updates.category && !updates.categoryName) {
    payload.categoryName = updates.category;
  }

  await updateDoc(docRef, payload);
  return { id, ...payload };
}

/**
 * Owner portal: Deletes a product.
 */
export async function deleteProduct(id) {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
  return { id, deleted: true };
}
