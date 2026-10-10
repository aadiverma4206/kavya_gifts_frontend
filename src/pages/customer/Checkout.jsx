import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { toDirectImageUrl } from "../../utils/driveImage";
import GiftWrapSelector from "../../components/customer/GiftWrapSelector";
import { initializeCheckoutOrder } from "../../controllers/orderController";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./Checkout.css";

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

  if (items.length === 0) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
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
    if (!phone.trim()) {
      setError("Please specify a contact phone number.");
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
      const existingOrderId = sessionStorage.getItem("kavya_pending_order_id");
      const order = await initializeCheckoutOrder({
        customer: {
          name: recipientName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          deliveryDate,
          notes,
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
        sessionStorage.setItem("kavya_pending_order_id", order.orderId);
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
      <div className="checkout-header">
        <h2>Checkout & Delivery Details</h2>
        <p className="muted">Complete the recipient details for your bespoke hamper delivery</p>
      </div>

      {error && <div className="checkout-alert error">{error}</div>}

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
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Phone Number *</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
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
                required
              />
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
              </div>

              <div className="form-group">
                <label>Delivery Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ring the bell twice, leave with guard"
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
            <h3>Order Summary</h3>

            <div className="summary-items-list">
              {items.map((item) => (
                <div key={item.product_id} className="summary-line-item">
                  <img src={toDirectImageUrl(item.image_url)} alt={item.product_name} />
                  <div className="summary-item-info">
                    <h4>{item.product_name}</h4>
                    <p className="muted">
                      Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="summary-item-subtotal">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-calc-breakdown">
              <div className="calc-row">
                <span>Hampers Subtotal:</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="calc-row">
                <span>Artisan Gift Wrapping:</span>
                <span>{giftWrapFee > 0 ? `₹${giftWrapFee.toLocaleString("en-IN")}` : "Free / None"}</span>
              </div>

              <div className="calc-row">
                <span>Standard Delivery:</span>
                <span style={{ color: "#166534", fontWeight: 600 }}>FREE (Festive Offer)</span>
              </div>

              <div className="calc-row total-row">
                <strong>Grand Total:</strong>
                <strong className="grand-total-amount">₹{grandTotal.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="btn btn-primary btn-block btn-pill"
              disabled={submitting}
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
