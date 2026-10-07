import { createContext, useContext, useEffect, useState } from "react";

// The cart lives entirely in the browser (localStorage)
const CART_STORAGE_KEY = "kavya_cart";
const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("Unable to save cart to localStorage:", err);
    }
  }, [items]);

  function addToCart(product, quantity = 1) {
    const productId = product.product_id || product.id;
    const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;

    setItems((prev) => {
      const existing = prev.find((item) => (item.product_id || item.id) === productId);
      if (existing) {
        return prev.map((item) =>
          (item.product_id || item.id) === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: productId,
          product_name: product.product_name,
          price,
          image_url: product.image_url,
          quantity,
        },
      ];
    });
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev
        .map((item) =>
          (item.product_id || item.id) === productId ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setItems((prev) =>
      prev.filter((item) => (item.product_id || item.id) !== productId)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
