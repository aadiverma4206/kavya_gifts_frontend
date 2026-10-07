import {
  getActiveProducts,
  getProductById,
  getFeaturedProducts,
  getProductsByCategory,
} from "../services/productService.js";

/**
 * Product Controller: Orchestrates business rules, stock validations,
 * gift wrapping eligibility, and data normalization for customer-facing products.
 */

/**
 * Retrieves all active catalog products.
 * @returns {Promise<Array>}
 */
export async function fetchActiveCatalog() {
  const products = await getActiveProducts();
  return products.filter((p) => p.status === "active");
}

/**
 * Retrieves a single active product by productId or slug.
 * @param {string} productId
 * @returns {Promise<Object>}
 */
export async function fetchProductDetails(productId) {
  if (!productId) {
    throw new Error("Product ID is required.");
  }
  const product = await getProductById(productId);
  if (!product || product.status !== "active") {
    throw new Error("This product is currently unavailable.");
  }
  return product;
}

/**
 * Evaluates real-time inventory and stock status for a product.
 * @param {Object} product
 * @returns {{ inStock: boolean, availableStock: number, isLowStock: boolean, message: string }}
 */
export function checkStockStatus(product) {
  if (!product) {
    return { inStock: false, availableStock: 0, isLowStock: false, message: "Product not found." };
  }

  const stock = typeof product.stockQuantity === "number" ? product.stockQuantity : Number(product.stockQuantity) || 0;

  if (stock <= 0) {
    return { inStock: false, availableStock: 0, isLowStock: false, message: "Out of Stock" };
  }

  if (stock <= 5) {
    return {
      inStock: true,
      availableStock: stock,
      isLowStock: true,
      message: `Only ${stock} left in stock - order soon!`,
    };
  }

  return {
    inStock: true,
    availableStock: stock,
    isLowStock: false,
    message: "In Stock",
  };
}

/**
 * Validates whether a product can be added or updated in cart with the requested quantity and gift wrapping.
 * Enforces:
 * - Product must be active
 * - Quantity >= 1
 * - Quantity <= available stock
 * - Gift wrapping only allowed if giftWrappingAvailable is true
 *
 * @param {Object} product - Product model
 * @param {number} requestedQuantity - Quantity desired
 * @param {boolean} giftWrappingSelected - Whether gift wrapping is selected
 * @returns {{ isValid: boolean, sanitizedQuantity: number, giftWrappingSelected: boolean, giftWrappingPrice: number, error: string|null }}
 */
export function validateProductForCart(product, requestedQuantity = 1, giftWrappingSelected = false) {
  if (!product) {
    return { isValid: false, error: "Product information is missing." };
  }

  if (product.status !== "active") {
    return { isValid: false, error: "This product is currently unavailable for purchase." };
  }

  const availableStock = typeof product.stockQuantity === "number"
    ? product.stockQuantity
    : Number(product.stockQuantity) || 0;

  if (availableStock < 1) {
    return { isValid: false, error: `"${product.productName || 'This product'}" is currently out of stock.` };
  }

  const qty = parseInt(requestedQuantity, 10);
  if (isNaN(qty) || qty < 1) {
    return { isValid: false, error: "Quantity must be at least 1." };
  }

  if (qty > availableStock) {
    return {
      isValid: false,
      error: `Cannot add ${qty} units. Only ${availableStock} left in stock for "${product.productName}".`,
    };
  }

  // Validate gift wrapping availability
  const hasGiftWrapAvailable = Boolean(product.giftWrappingAvailable);
  if (giftWrappingSelected && !hasGiftWrapAvailable) {
    return {
      isValid: false,
      error: `Gift wrapping is not available for "${product.productName}".`,
    };
  }

  const unitGiftWrapPrice = hasGiftWrapAvailable && giftWrappingSelected
    ? (Number(product.giftWrappingPrice) || 0)
    : 0;

  return {
    isValid: true,
    sanitizedQuantity: qty,
    giftWrappingSelected: Boolean(giftWrappingSelected && hasGiftWrapAvailable),
    giftWrappingPrice: unitGiftWrapPrice,
    error: null,
  };
}
