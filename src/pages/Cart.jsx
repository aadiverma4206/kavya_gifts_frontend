import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import GiftWrapSelector from "../components/customer/GiftWrapSelector.jsx";
import "./Cart.css";

export default function Cart() {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    giftWrap,
    updateGiftWrap,
    giftWrapFee,
    grandTotal,
  } = useCart();
  const { currentUser, isBlocked } = useAuth();

  if (items.length === 0) {
    return (
      <section className="section container" style={{ textAlign: "center", padding: "60px 0" }}>
        <h2>Your Cart is Empty</h2>
        <p className="muted" style={{ margin: "16px 0 24px" }}>
          You haven't selected any artisan hampers yet.
        </p>
        <Link to="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </section>
    );
  }

  function handleProceedToCheckout() {
    if (!currentUser) {
      // Direct guest to login first, then redirect directly to checkout
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
    } else {
      navigate("/checkout");
    }
  }

  return (
    <section className="section container">
      <h2>Your Gifting Cart</h2>

      {isBlocked && (
        <div className="auth-alert error" style={{ margin: "16px 0" }}>
          Your account is currently suspended from placing orders. Please contact customer care.
        </div>
      )}

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

            <button
              className="remove-btn"
              onClick={() => {
                removeFromCart(item.product_id);
                toast.info(`${item.product_name} removed from cart.`);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Gift Wrap Customizer inside Cart */}
      <GiftWrapSelector value={giftWrap} onChange={updateGiftWrap} />

      <div className="cart-summary-section card">
        <div className="cart-summary-breakdown">
          <div className="summary-row">
            <span>Hampers Subtotal:</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          {giftWrapFee > 0 && (
            <div className="summary-row">
              <span>Artisan Gift Wrapping:</span>
              <span>₹{giftWrapFee.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="summary-row total-row">
            <strong>Grand Total:</strong>
            <strong style={{ fontSize: "22px", color: "var(--color-primary)" }}>
              ₹{grandTotal.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <button
          onClick={handleProceedToCheckout}
          className="btn btn-primary btn-pill btn-block"
          style={{ maxWidth: "320px", marginLeft: "auto" }}
          disabled={isBlocked}
        >
          {currentUser ? "Proceed to Checkout →" : "Sign In to Checkout →"}
        </button>
      </div>
    </section>
  );
}
