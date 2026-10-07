import { validateProductForCart } from "./productController.js";

/**
 * Cart Controller: Enforces cart business logic, item total calculations,
 * stock limit boundaries, gift wrapping rules, and item deduplication.
 */

/**
 * Computes exact financials for a single line item.
 * @param {Object} item - { price, quantity, giftWrappingSelected, giftWrappingPrice }
 * @returns {{ itemSubtotal: number, giftWrappingTotal: number, total: number }}
 */
export function calculateItemFinancials(item) {
  const price = Number(item.price) || 0;
  const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
  const giftWrappingSelected = Boolean(item.giftWrappingSelected);
  const giftWrappingPrice = Number(item.giftWrappingPrice) || 0;

  const itemSubtotal = price * quantity;
  const giftWrappingTotal = giftWrappingSelected ? giftWrappingPrice * quantity : 0;
  const total = itemSubtotal + giftWrappingTotal;

  return {
    itemSubtotal,
    giftWrappingTotal,
    total,
  };
}

/**
 * Computes aggregate totals across all cart items.
 * Enforces:
 * - product subtotal: sum of itemSubtotals
 * - gift wrapping total: sum of gift wrapping charges
 * - grand total: product subtotal + gift wrapping total
 *
 * @param {Array} items
 * @returns {{ productSubtotal: number, giftWrappingTotal: number, grandTotal: number, totalItems: number }}
 */
export function calculateCartSummary(items = []) {
  let productSubtotal = 0;
  let giftWrappingTotal = 0;
  let totalItems = 0;

  for (const item of items) {
    const financials = calculateItemFinancials(item);
    productSubtotal += financials.itemSubtotal;
    giftWrappingTotal += financials.giftWrappingTotal;
    totalItems += Math.max(1, parseInt(item.quantity, 10) || 1);
  }

  const grandTotal = productSubtotal + giftWrappingTotal;

  return {
    productSubtotal,
    subtotal: productSubtotal, // alias for backwards compatibility
    giftWrappingTotal,
    giftWrapFee: giftWrappingTotal, // alias
    grandTotal,
    totalItems,
  };
}

/**
 * Normalizes and builds a strictly compliant Cart Item.
 * Throws an Error if product is unavailable, out of stock, or if invalid gift wrapping is requested.
 *
 * @param {Object} product - Product document from catalog
 * @param {number} quantity - Desired quantity (min 1, max stock)
 * @param {boolean} giftWrappingSelected - Whether gift wrapping is chosen
 * @returns {Object} Normalized Cart Item conforming to user requirements
 */
export function buildCartItem(product, quantity = 1, giftWrappingSelected = false) {
  const validation = validateProductForCart(product, quantity, giftWrappingSelected);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const productId = product.productId || product.product_id || product.id;
  const productName = product.productName || product.product_name || "Gift Hamper";
  const price = Number(product.price) || 0;
  const image = product.thumbnail || product.image_url || (Array.isArray(product.images) && product.images[0]) || "";
  const stockQuantity = typeof product.stockQuantity === "number" ? product.stockQuantity : 50;

  const itemFinancials = calculateItemFinancials({
    price,
    quantity: validation.sanitizedQuantity,
    giftWrappingSelected: validation.giftWrappingSelected,
    giftWrappingPrice: validation.giftWrappingPrice,
  });

  return {
    productId,
    productName,
    price,
    quantity: validation.sanitizedQuantity,
    image,
    giftWrappingSelected: validation.giftWrappingSelected,
    giftWrappingPrice: validation.giftWrappingPrice,
    giftWrappingAvailable: Boolean(product.giftWrappingAvailable),
    stockQuantity,
    itemSubtotal: itemFinancials.itemSubtotal,
    total: itemFinancials.total,

    // Backward compatibility aliases
    product_id: productId,
    product_name: productName,
    image_url: image,
  };
}

/**
 * Adds a product to the cart while preventing unnecessary duplicate items.
 * If the exact same product and gift wrapping configuration already exists,
 * the quantity is safely incremented without exceeding available stock.
 *
 * @param {Array} currentItems - Current cart items array
 * @param {Object} product - Product to add
 * @param {number} quantity - Quantity to add
 * @param {boolean} giftWrappingSelected - Gift wrapping chosen
 * @returns {{ items: Array, addedItem: Object, wasMerged: boolean }}
 */
export function addOrMergeCartItem(currentItems = [], product, quantity = 1, giftWrappingSelected = false) {
  const newItem = buildCartItem(product, quantity, giftWrappingSelected);
  const targetId = newItem.productId;
  const targetWrap = newItem.giftWrappingSelected;

  const existingIdx = currentItems.findIndex(
    (item) => (item.productId || item.product_id) === targetId && Boolean(item.giftWrappingSelected) === targetWrap
  );

  let updatedList = [];
  let wasMerged = false;

  if (existingIdx > -1) {
    wasMerged = true;
    const existing = currentItems[existingIdx];
    const availableStock = existing.stockQuantity || product.stockQuantity || 99;
    const combinedQuantity = (existing.quantity || 1) + newItem.quantity;

    if (combinedQuantity > availableStock) {
      throw new Error(
        `Cannot add ${newItem.quantity} more. You already have ${existing.quantity} in your cart, and only ${availableStock} are in stock.`
      );
    }

    const financials = calculateItemFinancials({
      price: existing.price,
      quantity: combinedQuantity,
      giftWrappingSelected: existing.giftWrappingSelected,
      giftWrappingPrice: existing.giftWrappingPrice,
    });

    const mergedItem = {
      ...existing,
      quantity: combinedQuantity,
      itemSubtotal: financials.itemSubtotal,
      total: financials.total,
    };

    updatedList = [...currentItems];
    updatedList[existingIdx] = mergedItem;
  } else {
    updatedList = [...currentItems, newItem];
  }

  return {
    items: updatedList,
    addedItem: newItem,
    wasMerged,
  };
}

/**
 * Updates quantity of a specific cart line item.
 * Enforces:
 * - Cannot drop below 1
 * - Cannot exceed product stock
 *
 * @param {Array} currentItems
 * @param {string} productId
 * @param {boolean} giftWrappingSelected
 * @param {number} nextQuantity
 * @returns {Array}
 */
export function updateCartItemQuantity(currentItems, productId, giftWrappingSelected, nextQuantity) {
  const parsedQty = parseInt(nextQuantity, 10);

  if (isNaN(parsedQty) || parsedQty < 1) {
    throw new Error("Quantity cannot be lower than 1. Use remove to take this item out of your cart.");
  }

  return currentItems.map((item) => {
    const isTarget = (item.productId || item.product_id) === productId && Boolean(item.giftWrappingSelected) === Boolean(giftWrappingSelected);
    if (!isTarget) return item;

    const availableStock = typeof item.stockQuantity === "number" ? item.stockQuantity : 99;
    if (parsedQty > availableStock) {
      throw new Error(`Only ${availableStock} units available in stock for "${item.productName}".`);
    }

    const financials = calculateItemFinancials({
      price: item.price,
      quantity: parsedQty,
      giftWrappingSelected: item.giftWrappingSelected,
      giftWrappingPrice: item.giftWrappingPrice,
    });

    return {
      ...item,
      quantity: parsedQty,
      itemSubtotal: financials.itemSubtotal,
      total: financials.total,
    };
  });
}

/**
 * Toggles or updates gift wrapping for an item in the cart.
 * Prevents unavailable gift wrapping.
 * Merges if toggling causes it to collide with another line item of the same product.
 *
 * @param {Array} currentItems
 * @param {string} productId
 * @param {boolean} currentGiftWrapSelected
 * @param {boolean} nextGiftWrapSelected
 * @param {Object} [productCatalogInfo] - Optional product catalog details if needed
 * @returns {Array}
 */
export function toggleCartItemGiftWrap(currentItems, productId, currentGiftWrapSelected, nextGiftWrapSelected, productCatalogInfo = null) {
  const targetItem = currentItems.find(
    (item) => (item.productId || item.product_id) === productId && Boolean(item.giftWrappingSelected) === Boolean(currentGiftWrapSelected)
  );

  if (!targetItem) return currentItems;

  const isWrapAvailable = productCatalogInfo
    ? Boolean(productCatalogInfo.giftWrappingAvailable)
    : targetItem.giftWrappingAvailable !== false;

  if (nextGiftWrapSelected && !isWrapAvailable) {
    throw new Error(`Gift wrapping is not available for "${targetItem.productName}".`);
  }

  const unitGiftWrapPrice = nextGiftWrapSelected
    ? (productCatalogInfo?.giftWrappingPrice || targetItem.giftWrappingPrice || 120)
    : 0;

  // Check if an item with nextGiftWrapSelected already exists
  const collisionIdx = currentItems.findIndex(
    (item) => (item.productId || item.product_id) === productId && Boolean(item.giftWrappingSelected) === Boolean(nextGiftWrapSelected)
  );

  if (collisionIdx > -1) {
    // Merge both items into the collision item
    const collisionItem = currentItems[collisionIdx];
    const combinedQuantity = collisionItem.quantity + targetItem.quantity;
    const availableStock = collisionItem.stockQuantity || 99;
    const finalQuantity = Math.min(availableStock, combinedQuantity);

    const financials = calculateItemFinancials({
      price: collisionItem.price,
      quantity: finalQuantity,
      giftWrappingSelected: nextGiftWrapSelected,
      giftWrappingPrice: unitGiftWrapPrice,
    });

    return currentItems
      .filter((item) => item !== targetItem)
      .map((item, idx) => {
        if ((item.productId || item.product_id) === productId && Boolean(item.giftWrappingSelected) === Boolean(nextGiftWrapSelected)) {
          return {
            ...item,
            quantity: finalQuantity,
            giftWrappingSelected: nextGiftWrapSelected,
            giftWrappingPrice: unitGiftWrapPrice,
            itemSubtotal: financials.itemSubtotal,
            total: financials.total,
          };
        }
        return item;
      });
  }

  // Otherwise simply update this line item
  return currentItems.map((item) => {
    if (item === targetItem) {
      const financials = calculateItemFinancials({
        price: item.price,
        quantity: item.quantity,
        giftWrappingSelected: nextGiftWrapSelected,
        giftWrappingPrice: unitGiftWrapPrice,
      });

      return {
        ...item,
        giftWrappingSelected: nextGiftWrapSelected,
        giftWrappingPrice: unitGiftWrapPrice,
        itemSubtotal: financials.itemSubtotal,
        total: financials.total,
      };
    }
    return item;
  });
}

/**
 * Removes an item from the cart.
 * @param {Array} currentItems
 * @param {string} productId
 * @param {boolean} giftWrappingSelected
 * @returns {Array}
 */
export function removeCartItem(currentItems, productId, giftWrappingSelected) {
  return currentItems.filter((item) => {
    const matches = (item.productId || item.product_id) === productId && Boolean(item.giftWrappingSelected) === Boolean(giftWrappingSelected);
    return !matches;
  });
}
