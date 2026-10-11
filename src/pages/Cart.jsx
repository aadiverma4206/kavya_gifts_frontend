import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency } from "../utils/formatters.js";
import { notify } from "../utils/notify.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import ProductCard from "../components/ProductCard.jsx";
import { getDummyFeaturedProducts } from "../data/dummyProducts.js";
import "./Cart.css";

const FALLBACK_CART_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function Cart() {
  useDocumentTitle("Shopping Cart");
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    toggleGiftWrapping,
    removeFromCart,
    clearCart,
    productSubtotal,
    giftWrappingTotal,
    grandTotal,
  } = useCart();
  const { currentUser, isBlocked } = useAuth();
  const recommendedHampers = getDummyFeaturedProducts().slice(0, 4);

  if (items.length === 0) {
    return (
      <section className="section container" style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎁</div>
        <h2>Your Gifting Cart is Empty</h2>
        <p className="muted" style={{ margin: "16px 0 24px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
          You haven't selected any artisan hampers yet. Explore our handcrafted festival and wedding collections to find the perfect gift.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginBottom: "48px" }}>
          Explore Full 100+ Catalog
        </Link>

        {recommendedHampers.length > 0 && (
          <div style={{ textAlign: "left", marginTop: "40px" }}>
            <h3 style={{ fontSize: "22px", marginBottom: "20px" }}>Trending Hampers You May Love</h3>
            <div className="product-grid">
              {recommendedHampers.map((hamper) => (
                <ProductCard key={hamper.productId} product={hamper} />
              ))}
            </div>
          </div>
        )}
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
      const pId = item.productId || item.product_id;
      updateQuantity(pId, item.giftWrappingSelected, nextQty);
    } catch (err) {
      toast.error(err.message || "Could not adjust quantity.");
    }
  }

  function handleGiftWrapToggle(item) {
    try {
      const pId = item.productId || item.product_id;
      const nextWrapState = !item.giftWrappingSelected;
      toggleGiftWrapping(pId, item.giftWrappingSelected, nextWrapState);
      toast.success(
        nextWrapState
          ? `Gift wrapping added for ${item.productName || item.product_name} (+₹${item.giftWrappingPrice || 120} each)`
          : `Gift wrapping removed for ${item.productName || item.product_name}`
      );
    } catch (err) {
      toast.error(err.message || "Cannot change gift wrapping for this item.");
    }
  }

  function handleClearCart() {
    if (window.confirm("Are you sure you want to remove all hampers from your cart?")) {
      clearCart();
      toast.info("Your cart has been cleared.");
    }
  }

  return (
    <section className="section container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2>Your Gifting Cart</h2>
          <p className="muted">Review your selected hampers, gift packaging preferences, and totals</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleClearCart}
            className="btn btn-secondary btn-sm"
            style={{ color: "#b91c1c", borderColor: "#fecaca" }}
          >
            Clear Cart
          </button>
          <Link to="/" className="btn btn-secondary btn-sm">
            + Add More Hampers
          </Link>
        </div>
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
                src={toDirectImageUrl(item.image || item.thumbnail || item.image_url || (Array.isArray(item.images) && item.images[0])) || FALLBACK_CART_IMAGE}
                alt={item.productName || item.product_name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_CART_IMAGE;
                }}
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
                  const pId = item.productId || item.product_id;
                  removeFromCart(pId, item.giftWrappingSelected);
                  notify.info(`${item.productName || item.product_name || 'Hamper'} removed from cart.`);
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
