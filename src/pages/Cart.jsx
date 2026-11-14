import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, ShoppingBag, ShieldCheck, Truck, Sparkles, ArrowRight, Tag, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency } from "../utils/formatters.js";
import { notify } from "../utils/notify.js";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import ProductCard from "../components/ProductCard.jsx";
import { getDummyFeaturedProducts } from "../data/dummyProducts.js";
import "./Cart.css";

/**
 * Vector placeholder SVG for cart items with missing or loading thumbnail imagery.
 * @constant {string}
 */
const FALLBACK_CART_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Minimum cart value required to unlock complimentary Pan-India Express shipping.
 * @constant {number}
 */
const FREE_SHIPPING_THRESHOLD = 999;

/**
 * Standard fee in INR charged per hamper for luxury velvet gift wrapping and custom wax seal.
 * @constant {number}
 */
const DEFAULT_GIFT_WRAP_FEE = 120;

/**
 * Valid promotional discount codes and their percentage deductions (0.10 = 10% off).
 * @constant {Record<string, number>}
 */
/**
 * Computes estimated delivery date range based on dispatch calendar (3 to 5 business days).
 * @param {Date} [baseDate=new Date()]
 * @returns {{ minDateStr: string, maxDateStr: string }}
 */
/**
 * Calculates discount amount in INR based on subtotal and percentage discount rate.
 * @param {number} subtotal - Products subtotal before discounts.
 * @param {number} rate - Discount multiplier (e.g. 0.10 for 10%).
 * @returns {number} Deducted discount value in INR.
 */
function calculateDiscountAmount(subtotal, rate) {
  if (!subtotal || subtotal <= 0 || !rate || rate <= 0) return 0;
  return Math.round(subtotal * rate);
}

function calculateEstimatedDeliveryRange(baseDate = new Date()) {
  const minDate = new Date(baseDate);
  minDate.setDate(minDate.getDate() + 3);
  const maxDate = new Date(baseDate);
  maxDate.setDate(maxDate.getDate() + 5);
  const options = { month: "short", day: "numeric" };
  return {
    minDateStr: minDate.toLocaleDateString("en-IN", options),
    maxDateStr: maxDate.toLocaleDateString("en-IN", options),
  };
}

const PROMO_DISCOUNTS = {
  KAVYALUXE: 0.1,
  FESTIVE10: 0.1,
  LUXURYVIP: 0.15,
};

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
  const [appliedPromoName, setAppliedPromoName] = useState("");
  const [discountRate, setDiscountRate] = useState(0);
  const recommendedHampers = getDummyFeaturedProducts().slice(0, 4);
  const discountAmount = calculateDiscountAmount(productSubtotal, discountRate);
  const payableGrandTotal = Math.max(0, grandTotal - discountAmount);

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

  /**
   * Navigates customer to authentication or checkout step with preserved return routing.
   */
  function handleProceedToCheckout() {
    if (!currentUser) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
    } else {
      navigate("/checkout");
    }
  }

  /**
   * Safely dispatches quantity adjustment for a specific cart line item.
   * @param {Object} item - Cart line item.
   * @param {number} nextQty - Target quantity.
   */
  function handleQtyChange(item, nextQty) {
    try {
      const pId = item.productId || item.product_id;
      updateQuantity(pId, item.giftWrappingSelected, nextQty);
    } catch (err) {
      toast.error(err.message || "Could not adjust quantity.");
    }
  }

  /**
   * Toggles custom artisan velvet gift wrapping and wax seal for a specific cart line item.
   * @param {Object} item - Cart line item.
   */
  function handleGiftWrapToggle(item) {
    try {
      const pId = item.productId || item.product_id;
      const nextWrapState = !item.giftWrappingSelected;
      toggleGiftWrapping(pId, item.giftWrappingSelected, nextWrapState);
      toast.success(
        nextWrapState
          ? `Gift wrapping added for ${item.productName || item.product_name} (+₹${item.giftWrappingPrice || DEFAULT_GIFT_WRAP_FEE} each)`
          : `Gift wrapping removed for ${item.productName || item.product_name}`
      );
    } catch (err) {
      toast.error(err.message || "Cannot change gift wrapping for this item.");
    }
  }

  function handleRemovePromo() {
    setPromoApplied(false);
    setAppliedPromoName("");
    setDiscountRate(0);
    setPromoCode("");
    toast.info("Coupon code removed.");
  }

  /**
   * Prompts customer confirmation before completely purging all items from the shopping bag.
   */
  function handleClearCart() {
    if (window.confirm("Are you sure you want to remove all hampers from your cart?")) {
      clearCart();
      toast.info("Your cart has been cleared.");
    }
  }

  function handleApplyPromo(e) {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return;
    if (PROMO_DISCOUNTS[cleanCode]) {
      const rate = PROMO_DISCOUNTS[cleanCode];
      setPromoApplied(true);
      setAppliedPromoName(cleanCode);
      setDiscountRate(rate);
      toast.success(`Promo code ${cleanCode} applied! (${Math.round(rate * 100)}% off subtotal)`);
    } else {
      toast.error("Invalid coupon code. Try 'KAVYALUXE' or 'FESTIVE10'");
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
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Free shipping unlock progress: ${progressPercent}%`}
        >
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
                        <span>{isWrapSelected ? `Artisan Velvet Wrapped (+₹${item.giftWrappingPrice || DEFAULT_GIFT_WRAP_FEE})` : "+ Add Velvet Gift Wrap"}</span>
                      </button>
                    </div>
                  )}

                  {/* Quantity & Line Total Row */}
                  <div className="cart-line-bottom-row">
                    <div className="quantity-selector-compact" role="group" aria-label={`Quantity selector for ${item.productName || item.product_name}`}>
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={() => handleQtyChange(item, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        title="Decrease quantity by 1"
                      >
                        −
                      </button>
                      <span className="qty-number" aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={isMaxStock}
                        onClick={() => handleQtyChange(item, item.quantity + 1)}
                        aria-label="Increase quantity"
                        title="Increase quantity by 1"
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
            {promoApplied ? (
              <div className="promo-applied-badge-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(122, 31, 43, 0.06)", borderRadius: "8px", marginBottom: "16px", border: "1px dashed var(--color-primary, #7a1f2b)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} color="var(--color-primary, #7a1f2b)" />
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>{appliedPromoName} ({Math.round(discountRate * 100)}% OFF)</span>
                </div>
                <button type="button" onClick={handleRemovePromo} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>
                  Remove
                </button>
              </div>
            ) : (
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
                  Apply
                </button>
              </form>
            )}

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

              {discountAmount > 0 && (
                <div className="summary-row promo-discount-row" style={{ color: "#16a34a" }}>
                  <span>Promo Discount ({appliedPromoName})</span>
                  <strong>-{formatCurrency(discountAmount)}</strong>
                </div>
              )}

              <div className="summary-row grand-total-row">
                <span>Grand Total</span>
                <strong className="grand-total-amount">{formatCurrency(payableGrandTotal)}</strong>
              </div>
            </div>

            {/* Estimated Delivery Notice */}
            <div className="cart-delivery-estimate-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", margin: "14px 0", fontSize: "12.5px" }}>
              <Clock size={16} className="muted" />
              <span>
                Estimated Delivery: <strong>{calculateEstimatedDeliveryRange().minDateStr} – {calculateEstimatedDeliveryRange().maxDateStr}</strong>
              </span>
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
              <div className="trust-point-item">
                <RotateCcw size={16} /> <span>Hassle-Free Replacement Guarantee on Transit Damage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
