import { festiveProducts } from "./categories/festive.js";
import { weddingProducts } from "./categories/weddings.js";
import { wellnessProducts } from "./categories/wellness.js";
import { birthdayProducts } from "./categories/birthdays.js";
import { corporateProducts } from "./categories/corporate.js";
import { chocolateProducts } from "./categories/chocolates.js";
import { perfumeProducts } from "./categories/perfumes.js";
import { flowerProducts } from "./categories/flowers.js";
import { gourmetProducts } from "./categories/gourmet.js";
import { babyMomProducts } from "./categories/babyMom.js";

/**
 * Normalizes raw dummy product to match complete Firestore schema + legacy aliases.
 */
function normalizeDummyProduct(raw) {
  const images = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.thumbnail];
  const thumbnail = raw.thumbnail || images[0] || "";

  return {
    id: raw.productId,
    productId: raw.productId,
    productName: raw.productName,
    slug: raw.slug,
    categoryId: raw.categoryId,
    categoryName: raw.categoryName,
    description: raw.description,
    shortDescription: raw.shortDescription,
    price: Number(raw.price) || 0,
    stockQuantity: Number(raw.stockQuantity) || 20,
    images,
    thumbnail,
    giftWrappingAvailable: Boolean(raw.giftWrappingAvailable),
    giftWrappingPrice: typeof raw.giftWrappingPrice === "number" ? raw.giftWrappingPrice : 120,
    status: raw.status || "active",
    featured: Boolean(raw.featured),
    createdAt: null,
    updatedAt: null,

    // Backward compatibility aliases
    product_id: raw.productId,
    product_name: raw.productName,
    image_url: thumbnail,
    stock_qty: Number(raw.stockQuantity) || 20,
    category: raw.categoryName,
  };
}

/**
 * Master catalog containing 110+ handcrafted dummy products with verified network images.
 */
export const DUMMY_PRODUCTS = [
  ...festiveProducts,
  ...weddingProducts,
  ...wellnessProducts,
  ...birthdayProducts,
  ...corporateProducts,
  ...chocolateProducts,
  ...perfumeProducts,
  ...flowerProducts,
  ...gourmetProducts,
  ...babyMomProducts,
].map(normalizeDummyProduct);

/**
 * Returns all active dummy products (110+ items).
 */
export function getDummyProducts() {
  return DUMMY_PRODUCTS.filter((p) => p.status === "active");
}

/**
 * Returns featured dummy products.
 */
export function getDummyFeaturedProducts() {
  return DUMMY_PRODUCTS.filter((p) => p.status === "active" && p.featured);
}

/**
 * Filters dummy products by category name or categoryId (case-insensitive).
 */
export function getDummyProductsByCategory(cat) {
  if (!cat) return [];
  const normalized = String(cat).trim().toLowerCase();
  return DUMMY_PRODUCTS.filter(
    (p) =>
      p.status === "active" &&
      (String(p.categoryName).toLowerCase() === normalized ||
        String(p.category).toLowerCase() === normalized ||
        String(p.categoryId).toLowerCase() === normalized)
  );
}

/**
 * Finds a single dummy product by productId, slug, or id.
 */
export function getDummyProductById(id) {
  if (!id) return null;
  const normalized = String(id).trim().toLowerCase();
  return (
    DUMMY_PRODUCTS.find(
      (p) =>
        String(p.productId).toLowerCase() === normalized ||
        String(p.product_id).toLowerCase() === normalized ||
        String(p.slug).toLowerCase() === normalized ||
        String(p.id).toLowerCase() === normalized
    ) || null
  );
}
