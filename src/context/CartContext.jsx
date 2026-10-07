import { createContext, useContext, useEffect, useState } from "react";
import { saveCloudCart, clearCloudCart } from "../services/cartService";

const CART_STORAGE_KEY = "kavya_cart";
const GIFT_WRAP_STORAGE_KEY = "kavya_gift_wrap";

export const GIFT_WRAP_OPTIONS = [
  { id: "none", name: "Standard Eco Packaging", price: 0, description: "Minimalistic elegant kraft box with craft tag" },
  { id: "velvet", name: "Royal Velvet Ribbon & Box", price: 150, description: "Deep maroon velvet box adorned with festive golden lace" },
  { id: "gold", name: "Classic Gold Satin Wrap", price: 120, description: "Warm champagne gold textured wrap with satin bow" },
  { id: "floral", name: "Floral Silk Keepsake Box", price: 180, description: "Artisan floral embroidered box suitable for Diwali & Weddings" },
];

const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadGiftWrap() {
  try {
    const raw = localStorage.getItem(GIFT_WRAP_STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : { enabled: false, optionId: "none", message: "", recipientName: "" };
  } catch {
    return { enabled: false, optionId: "none", message: "", recipientName: "" };
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [giftWrap, setGiftWrap] = useState(loadGiftWrap);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("Unable to save cart to localStorage:", err);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(GIFT_WRAP_STORAGE_KEY, JSON.stringify(giftWrap));
    } catch (err) {
      console.warn("Unable to save gift wrap to localStorage:", err);
    }
  }, [giftWrap]);

  function addToCart(product, quantity = 1, selectedGiftWrap = null) {
    const productId = product.productId || product.product_id || product.id;
    const productName = product.productName || product.product_name || "Gift Hamper";
    const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;
    const thumbnail = product.thumbnail || product.image_url || "";

    setItems((prev) => {
      const existing = prev.find((item) => (item.productId || item.product_id || item.id) === productId);
      if (existing) {
        return prev.map((item) =>
          (item.productId || item.product_id || item.id) === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId,
          product_id: productId,
          productName,
          product_name: productName,
          price,
          thumbnail,
          image_url: thumbnail,
          quantity,
        },
      ];
    });

    if (selectedGiftWrap && selectedGiftWrap.enabled) {
      setGiftWrap(selectedGiftWrap);
    }
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev
        .map((item) =>
          (item.productId || item.product_id || item.id) === productId ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setItems((prev) =>
      prev.filter((item) => (item.productId || item.product_id || item.id) !== productId)
    );
  }

  function clearCart(customerId = null) {
    setItems([]);
    setGiftWrap({ enabled: false, optionId: "none", message: "", recipientName: "" });
    if (customerId) {
      clearCloudCart(customerId);
    }
  }

  function updateGiftWrap(wrapData) {
    setGiftWrap((prev) => ({
      ...prev,
      ...wrapData,
    }));
  }

  // Cloud cart sync function for authenticated customer
  async function syncWithCloud(customerId) {
    if (!customerId) return;
    await saveCloudCart(customerId, {
      items,
      subtotal: itemsSubtotal,
      giftWrappingTotal: giftWrapFee,
      total: grandTotal,
    });
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const selectedWrapOption =
    GIFT_WRAP_OPTIONS.find((opt) => opt.id === giftWrap.optionId) || GIFT_WRAP_OPTIONS[0];

  const giftWrapFee = giftWrap.enabled ? selectedWrapOption.price : 0;
  const grandTotal = itemsSubtotal + giftWrapFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal: itemsSubtotal,
        giftWrap,
        updateGiftWrap,
        selectedWrapOption,
        giftWrapFee,
        grandTotal,
        syncWithCloud,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
