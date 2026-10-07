/**
 * Product catalog API adapter.
 * Directly delegates to Firebase Cloud Firestore services.
 */
import {
  getActiveProducts,
  getProductsByCategory as getProductsByCategoryService,
  getProductById as getProductByIdService,
} from "./services/productService";

export async function getAllProducts() {
  return getActiveProducts();
}

export async function getProductsByCategory(category) {
  return getProductsByCategoryService(category);
}

export async function getProductById(productId) {
  return getProductByIdService(productId);
}
