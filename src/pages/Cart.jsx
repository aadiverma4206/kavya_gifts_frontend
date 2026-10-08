import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency } from "../utils/formatters.js";
import { notify } from "../utils/notify.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import "./Cart.css";

export default function Cart() {
  useDocumentTitle("Shopping Cart");
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    toggleGiftWrapping,
    removeFromCart,
    productSubtotal,
    giftWrappingTotal,
    grandTotal,
  } = useCart();
  const { currentUser, isBlocked } = useAuth();

  if (items.length === 0) {
    return (
      <section className="section container" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎁</div>
        <h2>Your Gifting Cart is Empty</h2>
        <p className="muted" style={{ margin: "16px 0 24px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
          You haven't selected any artisan hampers yet. Explore our handcrafted festival and wedding collections to find the perfect gift.
        </p>
        <Link to="/" className="btn btn-primary">
          Explore Hampers Collection
        </Link>
      </section>
    );
  }

  function handleProceedToCheckout() {
    if (!currentUser) {
      // Direct guest to login first, then redirect to checkout
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
    } else {
      navigate("/checkout");
    }
  }

  function handleQtyChange(item, nextQty) {
    try {
      updateQuantity(item.productId, item.giftWrappingSelected, nextQty);
    } catch (err) {
      toast.error(err.message || "Could not adjust quantity.");
    }
  }

  function handleGiftWrapToggle(item) {
    try {
      const nextWrapState = !item.giftWrappingSelected;
      toggleGiftWrapping(item.productId, item.giftWrappingSelected, nextWrapState);
      toast.success(
        nextWrapState
          ? `Gift wrapping added for ${item.productName} (+₹${item.giftWrappingPrice || 120} each)`
          : `Gift wrapping removed for ${item.productName}`
      );
    } catch (err) {
      toast.error(err.message || "Cannot change gift wrapping for this item.");
    }
  }

  return (
    <section className="section container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2>Your Gifting Cart</h2>
          <p className="muted">Review your selected hampers, gift packaging preferences, and totals</p>
        </div>
        <Link to="/" className="btn btn-secondary btn-sm">
          + Add More Hampers
        </Link>
      </div>

      {isBlocked && (
        <div className="auth-alert error" style={{ margin: "16px 0" }}>
          Your account is currently suspended from placing orders. Please contact store care.
        </div>
      )}

      <div className="cart-items">
        {items.map((item, idx) => {
          const itemKey = `${item.productId || item.product_id}_${item.giftWrappingSelected ? "wrap" : "nowrap"}_${idx}`;
          const isMaxStock = item.quantity >= (item.stockQuantity || 99);
          const isWrapSelected = Boolean(item.giftWrappingSelected);
          const wrapAvailable = item.giftWrappingAvailable !== false;
          const wrapFeeTotal = isWrapSelected ? (item.giftWrappingPrice || 0) * item.quantity : 0;
          const lineTotal = (item.price * item.quantity) + wrapFeeTotal;

          return (
            <div className="cart-line card" key={itemKey} style={{ border: "1px solid #f0e6e4" }}>
              <img
                src={toDirectImageUrl(item.image || item.thumbnail || item.image_url)}
                alt={item.productName || item.product_name}
              />

              <div className="cart-line-info">
                <h4>{item.productName || item.product_name}</h4>
                <p className="muted" style={{ margin: "2px 0 6px", fontSize: "14px" }}>
                  ₹{Number(item.price).toLocaleString("en-IN")} each
                </p>

                {/* Per-item Gift Wrapping Toggle */}
                {wrapAvailable ? (
                  <div style={{ marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleGiftWrapToggle(item)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: isWrapSelected ? "1px solid var(--color-primary)" : "1px solid #d1d5db",
                        background: isWrapSelected ? "rgba(183, 110, 121, 0.1)" : "#f9fafb",
                        color: isWrapSelected ? "var(--color-primary)" : "#4b5563",
                      }}
                      title="Click to toggle gift wrapping for this hamper"
                    >
                      <span>{isWrapSelected ? "🎁 Artisan Gift Wrapped" : "📦 No Gift Wrapping"}</span>
                      <span style={{ fontSize: "11px", opacity: 0.85 }}>
                        {isWrapSelected ? `(+₹${item.giftWrappingPrice || 120}) • Change` : "• Add (+₹120)"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: "12px", fontStyle: "italic" }}>
                    Keepsake Box (Self-Packaged)
                  </span>
                )}
              </div>

              {/* Quantity Controls */}
              <div>
                <div className="quantity-selector">
                  <button
                    type="button"
                    disabled={item.quantity <= 1}
                    onClick={() => handleQtyChange(item, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span style={{ minWidth: "22px", textAlign: "center", fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isMaxStock}
                    onClick={() => handleQtyChange(item, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                {isMaxStock && (
                  <div style={{ fontSize: "10px", color: "#b45309", marginTop: "3px", textAlign: "center" }}>
                    Stock limit reached
                  </div>
                )}
              </div>

              {/* Line Totals Breakdown */}
              <div style={{ textAlign: "right" }}>
                <div className="cart-line-total" style={{ fontSize: "16px" }}>
                  {formatCurrency(lineTotal)}
                </div>
                {isWrapSelected && (
                  <div className="muted" style={{ fontSize: "11px", color: "var(--color-primary)" }}>
                    Includes {formatCurrency(wrapFeeTotal)} wrap fee
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                className="remove-btn"
                onClick={() => {
                  removeFromCart(item.productId, item.giftWrappingSelected);
                  notify.info(`${item.productName || 'Hamper'} removed from cart.`);
                }}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Cart Summary Card */}
      <div className="cart-summary-section card" style={{ borderRadius: "16px", border: "1px solid #f0e6e4" }}>
        <div className="cart-summary-breakdown">
          <div className="summary-row">
            <span>Product Subtotal:</span>
            <span>{formatCurrency(productSubtotal)}</span>
          </div>

          <div className="summary-row">
            <span>Gift Wrapping Total:</span>
            <span style={{ color: giftWrappingTotal > 0 ? "var(--color-primary)" : "#6b7280" }}>
              {giftWrappingTotal > 0 ? `+${formatCurrency(giftWrappingTotal)}` : "₹0 (None selected)"}
            </span>
          </div>

          <div className="summary-row">
            <span>Delivery:</span>
            <span style={{ color: "#166534", fontWeight: 600 }}>FREE (Complimentary)</span>
          </div>

          <div className="summary-row total-row">
            <strong>Grand Total:</strong>
            <strong style={{ fontSize: "24px", color: "var(--color-primary)" }}>
              {formatCurrency(grandTotal)}
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={handleProceedToCheckout}
            className="btn btn-primary btn-pill"
            style={{ minWidth: "260px" }}
            disabled={isBlocked}
          >
            {currentUser ? "Proceed to Checkout →" : "Sign In to Checkout →"}
          </button>
        </div>
      </div>
    </section>
  );
}
