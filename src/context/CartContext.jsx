import { createContext, useContext, useEffect, useState } from "react";

// The cart lives entirely in the browser (localStorage) since Google Sheets
// is not a safe place to store order/transaction data.
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
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(product, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.product_id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          price: product.price,
          image_url: product.image_url,
          quantity,
        },
      ];
    });
  }

  function updateQuantity(product_id, quantity) {
    setItems((prev) =>
      prev
        .map((item) => (item.product_id === product_id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(product_id) {
    setItems((prev) => prev.filter((item) => item.product_id !== product_id));
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
