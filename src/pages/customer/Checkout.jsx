import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { toDirectImageUrl } from "../../utils/driveImage";
import GiftWrapSelector from "../../components/customer/GiftWrapSelector";
import { initializeCheckoutOrder } from "../../controllers/orderController";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatCurrency } from "../../utils/formatters";
import "./Checkout.css";

const DEFAULT_HAMPER_FALLBACK_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Sanitizes and extracts a 10-digit Indian mobile number, stripping non-digits and leading country codes.
 * @param {string} raw - Raw phone input.
 * @returns {string} 10-digit cleaned mobile number or empty string.
 */
function cleanIndianPhoneNumber(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  return digits.length === 10 ? digits : "";
}

/**
 * Validates email address format using standard RFC 5322 regex.
 * @param {string} email - Email address string.
 * @returns {boolean} True if format is valid.
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Safely retrieves an item from sessionStorage with fallback for private browsing.
 * @param {string} key - Storage key.
 * @returns {string|null} Retrieved value.
 */
function getSafeSessionStorage(key) {
  try {
    return window?.sessionStorage ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/**
 * Safely stores an item in sessionStorage with exception suppression.
 * @param {string} key - Storage key.
 * @param {string} value - Storage string value.
 */
function setSafeSessionStorage(key, value) {
  try {
    if (window?.sessionStorage) window.sessionStorage.setItem(key, value);
  } catch {
    // Suppress storage quota errors
  }
}

/**
 * Extracts a valid 6-digit Indian Postal PIN code from an address string.
 * @param {string} addr - Full delivery address.
 * @returns {string|null} Extracted 6-digit PIN code or null.
 */
function extractPinCode(addr) {
  if (!addr || typeof addr !== "string") return null;
  const match = addr.match(/\b[1-9][0-9]{5}\b/);
  return match ? match[0] : null;
}

export default function Checkout() {
  useDocumentTitle("Checkout - Secure Delivery Details");
  const navigate = useNavigate();
  const { items, subtotal, giftWrap, updateGiftWrap, giftWrapFee, grandTotal } = useCart();
  const { currentUser, userProfile, isBlocked } = useAuth();

  // Shipping details state
  const [recipientName, setRecipientName] = useState(userProfile?.fullName || "");
  const [phone, setPhone] = useState(userProfile?.mobile || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [address, setAddress] = useState(userProfile?.address || "");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    if (userProfile) {
      if (userProfile.fullName && !recipientName) setRecipientName(userProfile.fullName);
      if (userProfile.mobile && !phone) setPhone(userProfile.mobile);
      if (userProfile.address && !address) setAddress(userProfile.address);
    }
    if (currentUser?.email && !email) {
      setEmail(currentUser.email);
    }
  }, [userProfile, currentUser]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Warn user before closing window with unsubmitted shipping details
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (submitting) return;
      const hasData = Boolean(recipientName.trim() || phone.trim() || address.trim());
      if (hasData) {
        e.preventDefault();
        e.returnValue = "You have unsaved checkout details. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [recipientName, phone, address, submitting]);

  if (items.length === 0) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎁</div>
        <h2>Your Cart is Empty</h2>
        <p className="muted" style={{ margin: "16px 0 24px" }}>
          Please add hampers to your cart before proceeding to checkout.
        </p>
        <Link to="/" className="btn btn-primary">
          Explore Hampers
        </Link>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h2>Account Blocked</h2>
        <p className="muted">Your account is currently blocked from placing new orders.</p>
      </div>
    );
  }

  async function handleProceedToPayment(e) {
    e.preventDefault();
    setError("");

    if (!recipientName.trim()) {
      setError("Please specify the recipient name.");
      return;
    }
    const cleanPhone = cleanIndianPhoneNumber(phone);
    if (!cleanPhone) {
      setError("Please specify a valid 10-digit contact mobile number.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please specify a valid email address for order updates.");
      return;
    }
    if (!address.trim() || address.trim().length < 8) {
      setError("Please provide a complete delivery address.");
      return;
    }

    if (deliveryDate) {
      const selected = new Date(deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        setError("Preferred delivery date cannot be in the past.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const existingOrderId = getSafeSessionStorage("kavya_pending_order_id");

      const order = await initializeCheckoutOrder({
        customer: {
          name: recipientName.trim(),
          phone: cleanPhone,
          email: email.trim(),
          address: address.trim(),
          deliveryDate,
          notes: notes.trim(),
        },
        items,
        subtotal,
        giftWrap,
        giftWrapFee,
        grandTotal,
        userId: currentUser?.uid,
        customerId: userProfile?.customerId,
        existingOrderId,
      });

      if (order?.orderId) {
        setSafeSessionStorage("kavya_pending_order_id", order.orderId);
      }

      // Pass checkout state & order to payment page
      navigate("/payment", {
        state: {
          order,
          customerInfo: {
            name: recipientName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            deliveryDate,
            notes,
          },
        },
      });
    } catch (err) {
      console.error("Order initialization error:", err);
      setError(err.message || "Failed to initialize order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-container container section">
      {/* Multi-step Checkout Stepper */}
      <div className="checkout-stepper-bar">
        <div className="step-point completed">
          <span className="step-num">✓</span>
          <span className="step-text">Cart</span>
        </div>
        <div className="step-connector completed" />
        <div className="step-point active">
          <span className="step-num">2</span>
          <span className="step-text">Delivery Details</span>
        </div>
        <div className="step-connector" />
        <div className="step-point">
          <span className="step-num">3</span>
          <span className="step-text">Payment</span>
        </div>
        <div className="step-connector" />
        <div className="step-point">
          <span className="step-num">4</span>
          <span className="step-text">Confirmation</span>
        </div>
      </div>

      <div className="checkout-header">
        <h2>Checkout & Delivery Details</h2>
        <p className="muted">Complete the recipient details for your bespoke hamper delivery</p>
      </div>

      {error && (
        <div className="checkout-alert error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <div className="checkout-grid">
        {/* Form Column */}
        <div className="checkout-form-column">
          <form id="checkout-form" onSubmit={handleProceedToPayment} className="card checkout-card">
            <h3>1. Delivery Address</h3>

            <div className="form-group">
              <label>Recipient / Contact Full Name *</label>
              <input
                type="text"
                placeholder="Full Name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                onBlur={() => setRecipientName((prev) => prev.trim())}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Phone Number *</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={13}
                  value={phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^\d+\s-]/g, "");
                    setPhone(digitsOnly);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={Boolean(currentUser?.email)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Detailed Delivery Address *</label>
              <textarea
                rows="3"
                placeholder="Door/Flat No, Apartment, Street, Landmark, City, State, PIN"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => setAddress((prev) => prev.trim())}
                required
              />
              {extractPinCode(address) && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    color: "#166534",
                    background: "#dcfce7",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    marginTop: "6px",
                    fontWeight: 600,
                  }}
                >
                  📍 Detected PIN Code: {extractPinCode(address)} (Express Delivery Eligible)
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Preferred Delivery Date (Optional)</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
                <span className="muted" style={{ fontSize: "11.5px", marginTop: "4px", display: "block" }}>
                  ✨ Standard dispatch takes 2–3 business days. Leave blank for earliest delivery.
                </span>
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ margin: 0 }}>Delivery Instructions (Optional)</label>
                  <span style={{ fontSize: "11px", color: notes.length > 180 ? "#b91c1c" : "var(--color-muted)" }}>
                    {notes.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Ring the bell twice, leave with guard"
                  maxLength={200}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </form>

          {/* Gift Wrap Selector inside Checkout */}
          <GiftWrapSelector value={giftWrap} onChange={updateGiftWrap} />
        </div>

        {/* Order Summary Column */}
        <div className="checkout-summary-column">
          <div className="card summary-card">
            <h3>Order Summary ({items.length} {items.length === 1 ? "hamper" : "hampers"})</h3>

            <div className="summary-items-list">
              {items.map((item, idx) => {
                const itemKey = item.cartItemId || `${item.productId || item.product_id}_${item.giftWrappingSelected ? "wrap" : "nowrap"}_${idx}`;
                const itemImg = item.image_url || item.thumbnail || item.image || (Array.isArray(item.images) && item.images[0]);
                const itemPrice = Number(item.price) || 0;
                const itemQty = Number(item.quantity) || 1;
                return (
                  <div key={itemKey} className="summary-line-item">
                    <img
                      src={toDirectImageUrl(itemImg) || DEFAULT_HAMPER_FALLBACK_SVG}
                      alt={item.product_name || item.productName}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_HAMPER_FALLBACK_SVG;
                      }}
                    />
                    <div className="summary-item-info">
                      <h4>{item.product_name || item.productName}</h4>
                      <p className="muted">
                        Qty: {itemQty} × {formatCurrency(itemPrice)}
                        {item.giftWrappingSelected && <span style={{ color: "var(--color-primary)", marginLeft: "4px" }}>(Gift Wrapped)</span>}
                      </p>
                    </div>
                    <span className="summary-item-subtotal">
                      {formatCurrency(itemPrice * itemQty)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="summary-calc-breakdown">
              <div className="calc-row">
                <span>Hampers Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="calc-row">
                <span>Artisan Gift Wrapping:</span>
                <span>{giftWrapFee > 0 ? formatCurrency(giftWrapFee) : "Free / None"}</span>
              </div>
              {Boolean(giftWrap?.enabled && giftWrap?.message) && (
                <div style={{ fontSize: "11.5px", background: "#fdf8ee", border: "1px solid #f9dfb8", borderRadius: "4px", padding: "6px 8px", color: "#854d0e", fontStyle: "italic" }}>
                  💌 "{giftWrap.message}"
                </div>
              )}

              <div className="calc-row">
                <span>Standard Delivery:</span>
                <span style={{ color: "#166534", fontWeight: 600 }}>FREE (Festive Offer)</span>
              </div>

              <div className="calc-row total-row">
                <strong>Grand Total:</strong>
                <strong className="grand-total-amount">{formatCurrency(grandTotal)}</strong>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="btn btn-primary btn-block btn-pill"
              disabled={submitting}
              aria-busy={submitting}
              aria-label={submitting ? "Preparing your gift hamper order" : "Proceed to secure payment"}
            >
              {submitting ? "Preparing Order..." : "Continue to Payment →"}
            </button>

            <p className="security-guarantee muted">
              🔒 100% Secure Checkout • Curated Fresh Daily
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
