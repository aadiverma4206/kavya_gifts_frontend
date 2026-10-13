import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, ShoppingBag, ShieldCheck, Truck, Sparkles, ArrowRight, Tag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency } from "../utils/formatters.js";
import { notify } from "../utils/notify.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import ProductCard from "../components/ProductCard.jsx";
import { getDummyFeaturedProducts } from "../data/dummyProducts.js";
import "./Cart.css";

const FALLBACK_CART_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

const FREE_SHIPPING_THRESHOLD = 999;

export default function Cart() {
  useDocumentTitle("Shopping Bag - Kavya Gifting");
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
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const recommendedHampers = getDummyFeaturedProducts().slice(0, 4);

  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - grandTotal);
  const progressPercent = Math.min(100, Math.round((grandTotal / FREE_SHIPPING_THRESHOLD) * 100));

  if (items.length === 0) {
    return (
      <section className="section container empty-cart-view">
        <div className="empty-cart-orb">
          <ShoppingBag size={48} className="empty-cart-icon" />
        </div>
        <h2>Your Gifting Bag is Empty</h2>
        <p className="muted empty-cart-sub">
          You haven't selected any artisan hampers yet. Explore our handcrafted festive, wedding, and milestone collections to curate your bespoke gift.
        </p>
        <Link to="/" className="btn btn-primary btn-pill">
          Explore 100+ Hampers <ArrowRight size={16} />
        </Link>

        {recommendedHampers.length > 0 && (
          <div className="empty-cart-recommendations">
            <div className="recommendations-header">
              <span className="section-eyebrow">CURATED FOR YOU</span>
              <h3>Patron Favorites & Festive Best-Sellers</h3>
            </div>
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

  function handleApplyPromo(e) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    if (promoCode.trim().toUpperCase() === "KAVYALUXE") {
      setPromoApplied(true);
      toast.success("Promo code KAVYALUXE applied successfully!");
    } else {
      toast.error("Invalid coupon code. Try 'KAVYALUXE'");
    }
  }

  return (
    <section className="section container cart-page-container">
      {/* Free Shipping Progress Meter */}
      <div className="shipping-progress-card card">
        <div className="progress-top-row">
          <div className="progress-label">
            <Truck size={16} className="progress-truck-icon" />
            {amountNeeded === 0 ? (
              <span className="unlocked-text">🎉 Congratulations! You have unlocked FREE Express Delivery!</span>
            ) : (
              <span>
                Add <strong>{formatCurrency(amountNeeded)}</strong> more to unlock <strong>FREE Express Pan-India Delivery</strong>
              </span>
            )}
          </div>
          <span className="progress-percent-badge">{progressPercent}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="cart-header-row">
        <div>
          <h2>Your Gifting Bag</h2>
          <p className="muted">Review selected hampers, artisanal packaging, and delivery summary</p>
        </div>
        <div className="cart-header-actions">
          <button
            type="button"
            onClick={handleClearCart}
            className="btn btn-secondary btn-sm clear-cart-btn"
          >
            Clear Bag
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

      <div className="cart-layout-grid">
        {/* Left Column: Items */}
        <div className="cart-items-column">
          {items.map((item, idx) => {
            const itemKey = `${item.productId || item.product_id}_${item.giftWrappingSelected ? "wrap" : "nowrap"}_${idx}`;
            const isMaxStock = item.quantity >= (item.stockQuantity || 99);
            const isWrapSelected = Boolean(item.giftWrappingSelected);
            const wrapAvailable = item.giftWrappingAvailable !== false;
            const wrapFeeTotal = isWrapSelected ? (item.giftWrappingPrice || 0) * item.quantity : 0;
            const lineTotal = item.price * item.quantity + wrapFeeTotal;

            return (
              <div className="modern-cart-line card" key={itemKey}>
                <div className="cart-line-thumb-wrap">
                  <img
                    src={
                      toDirectImageUrl(
                        item.image ||
                          item.thumbnail ||
                          item.image_url ||
                          (Array.isArray(item.images) && item.images[0])
                      ) || FALLBACK_CART_IMAGE
                    }
                    alt={item.productName || item.product_name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_CART_IMAGE;
                    }}
                  />
                </div>

                <div className="cart-line-content">
                  <div className="cart-line-top">
                    <div>
                      <h4 className="cart-line-title">{item.productName || item.product_name}</h4>
                      <p className="cart-line-unit-price">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>

                    <button
                      type="button"
                      className="cart-remove-icon-btn"
                      onClick={() => removeFromCart(item.productId || item.product_id, item.giftWrappingSelected)}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Gift Wrap Pill */}
                  {wrapAvailable && (
                    <div className="cart-wrap-action-row">
                      <button
                        type="button"
                        onClick={() => handleGiftWrapToggle(item)}
                        className={`wrap-toggle-badge ${isWrapSelected ? "active" : ""}`}
                        title="Toggle gift wrapping"
                      >
                        <Sparkles size={12} />
                        <span>{isWrapSelected ? "Artisan Velvet Wrapped (+₹120)" : "+ Add Velvet Gift Wrap"}</span>
                      </button>
                    </div>
                  )}

                  {/* Quantity & Line Total Row */}
                  <div className="cart-line-bottom-row">
                    <div className="quantity-selector-compact">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={() => handleQtyChange(item, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="qty-number">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={isMaxStock}
                        onClick={() => handleQtyChange(item, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-line-subtotal">
                      <span className="subtotal-label">Subtotal:</span>
                      <span className="subtotal-amount">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary */}
        <div className="cart-summary-column">
          <div className="cart-summary-card card">
            <h3 className="summary-card-title">Order Summary</h3>

            {/* Promo Code Input */}
            <form className="promo-input-group" onSubmit={handleApplyPromo}>
              <div className="promo-field-wrap">
                <Tag size={15} className="promo-icon" />
                <input
                  type="text"
                  placeholder="Enter Coupon (e.g. KAVYALUXE)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-apply" disabled={promoApplied}>
                {promoApplied ? "Applied" : "Apply"}
              </button>
            </form>

            <div className="summary-breakdown-list">
              <div className="summary-row">
                <span>Hampers Subtotal</span>
                <strong>{formatCurrency(productSubtotal)}</strong>
              </div>

              {giftWrappingTotal > 0 && (
                <div className="summary-row">
                  <span>Artisan Gift Wrapping</span>
                  <strong>{formatCurrency(giftWrappingTotal)}</strong>
                </div>
              )}

              <div className="summary-row">
                <span>Estimated Shipping</span>
                <span className="shipping-badge">
                  {amountNeeded === 0 ? "FREE" : "₹99"}
                </span>
              </div>

              <div className="summary-row grand-total-row">
                <span>Grand Total</span>
                <strong className="grand-total-amount">{formatCurrency(grandTotal)}</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-checkout-main"
              onClick={handleProceedToCheckout}
              disabled={isBlocked}
            >
              Proceed to Secure Checkout <ArrowRight size={16} />
            </button>

            {/* Trust Points */}
            <div className="cart-trust-points">
              <div className="trust-point-item">
                <ShieldCheck size={16} /> <span>256-bit SSL Bank-Grade Encryption</span>
              </div>
              <div className="trust-point-item">
                <Truck size={16} /> <span>Fragile-Safe Thermal & Shock Packaging</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
