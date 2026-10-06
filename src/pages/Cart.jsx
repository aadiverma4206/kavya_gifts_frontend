import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./Cart.css";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <section className="section container">
        <h2>Your Cart</h2>
        <p className="muted">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="section container">
      <h2>Your Cart</h2>

      <div className="cart-items">
        {items.map((item) => (
          <div className="cart-line" key={item.product_id}>
            <img src={toDirectImageUrl(item.image_url)} alt={item.product_name} />
            <div className="cart-line-info">
              <h4>{item.product_name}</h4>
              <p className="muted">₹{item.price.toLocaleString("en-IN")}</p>
            </div>

            <div className="quantity-selector">
              <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
            </div>

            <p className="cart-line-total">
              ₹{(item.price * item.quantity).toLocaleString("en-IN")}
            </p>

            <button className="remove-btn" onClick={() => removeFromCart(item.product_id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <p>
          Subtotal: <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
        </p>
        <button className="btn btn-primary btn-pill">Proceed to Checkout</button>
      </div>
    </section>
  );
}
