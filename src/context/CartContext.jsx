import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  calculateCartSummary,
  addOrMergeCartItem,
  updateCartItemQuantity,
  toggleCartItemGiftWrap,
  removeCartItem,
} from "../controllers/cartController.js";
import {
  getCloudCart,
  saveCloudCart,
  clearCloudCart,
  mergeGuestCartWithCloudCart,
} from "../services/cartService.js";

const CART_STORAGE_KEY = "kavya_cart";

export const GIFT_WRAP_OPTIONS = [
  { id: "standard", name: "Standard Packaging", price: 0, description: "Minimalistic elegant kraft box with craft tag" },
  { id: "artisan", name: "Artisan Gift Wrapping", price: 120, description: "Bespoke textured wrapping with satin ribbon & handwritten note" },
  { id: "velvet", name: "Royal Velvet Ribbon & Box", price: 150, description: "Deep maroon velvet box adorned with festive golden lace" },
];

const CartContext = createContext(null);

function loadLocalCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { currentUser, userProfile } = useAuth();
  const [items, setItems] = useState(loadLocalCart);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousCustomerIdRef = useRef(null);

  const activeCustomerId = userProfile?.customerId || (currentUser?.uid ? `CUS-${currentUser.uid}` : null);

  // 1. Sync items to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("Unable to save cart to localStorage:", err);
    }
  }, [items]);

  // 2. Customer Authentication transition: Migrate guest cart or load cloud cart
  useEffect(() => {
    const prevCustId = previousCustomerIdRef.current;
    previousCustomerIdRef.current = activeCustomerId;

    async function handleAuthChange() {
      if (activeCustomerId) {
        // Customer just logged in or profile loaded
        const localItems = loadLocalCart();

        if (localItems.length > 0) {
          // Migrate & merge guest cart into cloud cart atomically
          try {
            const mergedCart = await mergeGuestCartWithCloudCart(activeCustomerId, localItems);
            if (mergedCart && Array.isArray(mergedCart.items)) {
              setItems(mergedCart.items);
            }
          } catch (err) {
            console.warn("Error migrating guest cart to cloud:", err);
          }
        } else {
          // Load customer's existing cloud cart
          try {
            const cloudCart = await getCloudCart(activeCustomerId);
            if (cloudCart && Array.isArray(cloudCart.items)) {
              setItems(cloudCart.items);
            }
          } catch (err) {
            console.warn("Error fetching customer cloud cart:", err);
          }
        }
      } else if (prevCustId && !activeCustomerId) {
        // Customer logged out - reset active cart
        setItems([]);
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch {}
      }
      setIsInitialized(true);
    }

    handleAuthChange();
  }, [activeCustomerId]);

  // 3. Helper to update items and persist to cloud if customer is authenticated
  function commitItems(updatedItems) {
    setItems(updatedItems);
    if (activeCustomerId) {
      const summary = calculateCartSummary(updatedItems);
      saveCloudCart(activeCustomerId, {
        items: updatedItems,
        productSubtotal: summary.productSubtotal,
        giftWrappingTotal: summary.giftWrappingTotal,
        grandTotal: summary.grandTotal,
        totalItems: summary.totalItems,
      }).catch((e) => console.warn("Cloud cart auto-save warning:", e));
    }
  }

  /**
   * Adds an item to the cart, merging with existing items if matching,
   * enforcing stock limits and validating gift wrapping.
   */
  function addToCart(product, quantity = 1, giftWrappingSelected = false) {
    // If giftWrappingSelected is an object (from legacy giftWrapSelector), extract boolean
    const wrapSelected = typeof giftWrappingSelected === "object" && giftWrappingSelected !== null
      ? Boolean(giftWrappingSelected.enabled)
      : Boolean(giftWrappingSelected);

    const result = addOrMergeCartItem(items, product, quantity, wrapSelected);
    commitItems(result.items);
    return result;
  }

  /**
   * Updates quantity of a cart line item.
   * Supports both (productId, giftWrappingSelected, quantity) and legacy (productId, quantity).
   */
  function updateQuantity(productId, arg2, arg3) {
    let wrapSelected;
    let nextQty;

    if (arg3 !== undefined) {
      wrapSelected = Boolean(arg2);
      nextQty = arg3;
    } else {
      // Legacy signature: updateQuantity(productId, quantity)
      nextQty = arg2;
      const match = items.find((it) => (it.productId || it.product_id) === productId);
      wrapSelected = match ? Boolean(match.giftWrappingSelected) : false;
    }

    try {
      const updated = updateCartItemQuantity(items, productId, wrapSelected, nextQty);
      commitItems(updated);
    } catch (err) {
      console.warn("Quantity update error:", err.message);
      throw err;
    }
  }

  /**
   * Toggles or updates gift wrapping for an item in the cart.
   */
  function toggleGiftWrapping(productId, currentGiftWrapSelected, nextGiftWrapSelected, productCatalogInfo = null) {
    try {
      const updated = toggleCartItemGiftWrap(
        items,
        productId,
        currentGiftWrapSelected,
        nextGiftWrapSelected,
        productCatalogInfo
      );
      commitItems(updated);
    } catch (err) {
      console.warn("Gift wrapping update error:", err.message);
      throw err;
    }
  }

  /**
   * Removes an item from the cart.
   * Supports both (productId, giftWrappingSelected) and legacy (productId).
   */
  function removeFromCart(productId, giftWrappingSelected) {
    if (giftWrappingSelected !== undefined) {
      const updated = removeCartItem(items, productId, giftWrappingSelected);
      commitItems(updated);
    } else {
      // Remove all lines matching this productId
      const updated = items.filter((it) => (it.productId || it.product_id) !== productId);
      commitItems(updated);
    }
  }

  /**
   * Clears cart completely.
   */
  function clearCart(explicitCustomerId = null) {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}

    const custId = explicitCustomerId || activeCustomerId;
    if (custId) {
      clearCloudCart(custId).catch(() => {});
    }
  }

  // Calculate cart totals via controller
  const totals = calculateCartSummary(items);

  // Backward compatibility giftWrap object
  const legacyGiftWrap = {
    enabled: totals.giftWrappingTotal > 0,
    optionId: totals.giftWrappingTotal > 0 ? "artisan" : "none",
    price: totals.giftWrappingTotal,
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        toggleGiftWrapping,
        removeFromCart,
        clearCart,
        // Financials & Totals conforming to specification
        productSubtotal: totals.productSubtotal,
        subtotal: totals.productSubtotal, // alias
        itemsSubtotal: totals.productSubtotal, // alias
        giftWrappingTotal: totals.giftWrappingTotal,
        giftWrapFee: totals.giftWrappingTotal, // alias
        grandTotal: totals.grandTotal,
        totalItems: totals.totalItems,
        // Backward compatibility
        giftWrap: legacyGiftWrap,
        updateGiftWrap: () => {},
        GIFT_WRAP_OPTIONS,
        isInitialized,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
