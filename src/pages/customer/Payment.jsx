import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createOrder } from "../../services/orderService";
import { recordPayment } from "../../services/paymentService";
import "./Payment.css";

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, subtotal, giftWrap, giftWrapFee, grandTotal, clearCart } = useCart();
  const { currentUser, userProfile, isBlocked } = useAuth();

  const customerInfo = location.state?.customerInfo || {
    name: userProfile?.fullName || "Valued Customer",
    phone: userProfile?.mobile || "",
    email: currentUser?.email || "",
    address: userProfile?.address || "",
  };

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h2>No Active Order</h2>
        <p className="muted">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
          Browse Hampers
        </Link>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h2>Account Blocked</h2>
        <p className="muted">Your account is suspended and cannot complete payments.</p>
      </div>
    );
  }

  async function handleCompletePayment(e) {
    e.preventDefault();
    setError("");

    if (paymentMethod === "upi" && !upiId.includes("@")) {
      setError("Please provide a valid UPI ID (e.g. name@okhdfcbank).");
      return;
    }
    if (paymentMethod === "card" && (!cardNumber || cardNumber.replace(/\s/g, "").length < 16)) {
      setError("Please provide a valid 16-digit card number.");
      return;
    }

    setProcessing(true);

    try {
      // 1. Determine readable method label & provider
      const provider =
        paymentMethod === "upi"
          ? "UPI"
          : paymentMethod === "card"
          ? "Card"
          : paymentMethod === "netbanking"
          ? "NetBanking"
          : "COD";

      const methodLabel =
        paymentMethod === "upi"
          ? `UPI (${upiId})`
          : paymentMethod === "card"
          ? `Card (ending ${cardNumber.slice(-4) || "XXXX"})`
          : paymentMethod === "netbanking"
          ? "Net Banking"
          : "Pay on Delivery (COD)";

      const providerPaymentId =
        paymentMethod === "upi"
          ? upiId
          : paymentMethod === "card"
          ? `CARD-${Date.now()}`
          : null;

      // 2. Create Order in Firestore (generates ORD-10001)
      const order = await createOrder({
        customer: customerInfo,
        items,
        subtotal,
        giftWrap,
        giftWrappingTotal: giftWrapFee,
        totalAmount: grandTotal,
        userId: currentUser?.uid,
        customerId: userProfile?.customerId,
        paymentStatus: paymentMethod === "cod" ? "pending" : "completed",
        paymentMethod: methodLabel,
      });

      // 3. Record Payment transaction in Firestore (generates PAY-10001)
      const payment = await recordPayment({
        orderId: order.orderId,
        amount: grandTotal,
        provider,
        providerPaymentId,
        paymentMethod: methodLabel,
        userId: currentUser?.uid,
        customerId: userProfile?.customerId,
        paymentStatus: paymentMethod === "cod" ? "pending" : "completed",
      });

      // 4. Clear cart and navigate to confirmation
      clearCart();
      navigate(`/order-confirmation/${order.orderId}`, {
        state: { order, payment },
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Unable to complete order payment. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <div className="payment-container container section">
      <div className="payment-header">
        <h2>Select Payment Method</h2>
        <p className="muted">
          Pay ₹{grandTotal.toLocaleString("en-IN")} securely to confirm your gift hamper booking
        </p>
      </div>

      {error && <div className="checkout-alert error">{error}</div>}

      <div className="payment-grid">
        {/* Payment Methods */}
        <div className="payment-methods-card card">
          <form onSubmit={handleCompletePayment}>
            {/* UPI Option */}
            <div
              className={`payment-option-row ${paymentMethod === "upi" ? "active" : ""}`}
              onClick={() => setPaymentMethod("upi")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "upi"}
                onChange={() => setPaymentMethod("upi")}
              />
              <div className="payment-option-info">
                <strong>UPI / Instant QR</strong>
                <p className="muted">Google Pay, PhonePe, Paytm, BHIM</p>
              </div>
              <span className="fast-badge">Fastest</span>
            </div>

            {paymentMethod === "upi" && (
              <div className="payment-subform">
                <label>Enter Virtual Payment Address (UPI ID):</label>
                <input
                  type="text"
                  placeholder="e.g. mobile@upi or username@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                />
                <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
                  A payment authorization request will be sent to your UPI app.
                </span>
              </div>
            )}

            {/* Card Option */}
            <div
              className={`payment-option-row ${paymentMethod === "card" ? "active" : ""}`}
              onClick={() => setPaymentMethod("card")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              <div className="payment-option-info">
                <strong>Credit / Debit Card</strong>
                <p className="muted">Visa, Mastercard, RuPay, Amex</p>
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="payment-subform">
                <div className="form-group">
                  <label>Name on Card</label>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="12/28"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking */}
            <div
              className={`payment-option-row ${paymentMethod === "netbanking" ? "active" : ""}`}
              onClick={() => setPaymentMethod("netbanking")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "netbanking"}
                onChange={() => setPaymentMethod("netbanking")}
              />
              <div className="payment-option-info">
                <strong>Net Banking</strong>
                <p className="muted">All major Indian banks supported (HDFC, ICICI, SBI, Axis)</p>
              </div>
            </div>

            {/* Cash / Pay on Delivery */}
            <div
              className={`payment-option-row ${paymentMethod === "cod" ? "active" : ""}`}
              onClick={() => setPaymentMethod("cod")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              <div className="payment-option-info">
                <strong>Pay on Delivery / Cash on Delivery</strong>
                <p className="muted">Pay via cash or UPI upon hamper doorstep delivery</p>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-pill"
              disabled={processing}
              style={{ marginTop: "24px" }}
            >
              {processing ? "Authorizing Payment..." : `Pay ₹${grandTotal.toLocaleString("en-IN")} & Confirm Order`}
            </button>
          </form>
        </div>

        {/* Recipient & Summary Sidebar */}
        <div className="payment-sidebar">
          <div className="card payment-summary-card">
            <h4>Delivering To:</h4>
            <p className="recipient-name"><strong>{customerInfo.name}</strong></p>
            <p className="muted" style={{ fontSize: "13.5px", marginBottom: "8px" }}>
              {customerInfo.address}
            </p>
            <p className="muted" style={{ fontSize: "13px" }}>📞 {customerInfo.phone}</p>

            {giftWrap?.enabled && (
              <div className="gift-wrap-recap">
                <span className="wrap-tag">🎁 {giftWrap.optionName}</span>
                {giftWrap.message && (
                  <p className="recap-message">"{giftWrap.message}"</p>
                )}
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px dashed rgba(122, 31, 43, 0.2)", margin: "16px 0" }} />

            <div className="recap-pricing">
              <div className="recap-row">
                <span>Hampers Total:</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {giftWrapFee > 0 && (
                <div className="recap-row">
                  <span>Gift Wrapping:</span>
                  <span>₹{giftWrapFee.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="recap-row total">
                <strong>Total Payable:</strong>
                <strong style={{ color: "var(--color-primary)", fontSize: "18px" }}>
                  ₹{grandTotal.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
