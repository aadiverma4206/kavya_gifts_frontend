import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { getOrderById } from "../../services/orderService";
import {
  initiatePayment,
  verifyPaymentTransaction,
  handlePaymentFailure,
  handlePaymentCancellation,
  retryPaymentForOrder,
} from "../../controllers/paymentController";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./Payment.css";

export default function Payment() {
  useDocumentTitle("Secure Payment - Kavya Luxury Gifts");
  const location = useLocation();
  const navigate = useNavigate();
  const { items, subtotal, giftWrap, giftWrapFee, grandTotal, clearCart } = useCart();
  const { currentUser, userProfile, isBlocked } = useAuth();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loadingOrder, setLoadingOrder] = useState(!location.state?.order);

  const customerInfo = location.state?.customerInfo || order?.customerSnapshot || {
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

  // Payment UI state machine: 'idle' | 'initiating' | 'verifying' | 'failed' | 'cancelled' | 'network_error'
  const [paymentState, setPaymentState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activePaymentRecord, setActivePaymentRecord] = useState(null);

  // Simulation controls for testing edge cases
  const [simulateOutcome, setSimulateOutcome] = useState("success"); // 'success' | 'failure' | 'cancelled'

  // Load existing pending order if navigated directly or refreshed
  useEffect(() => {
    if (!order) {
      const pendingOrderId = sessionStorage.getItem("kavya_pending_order_id");
      if (pendingOrderId) {
        getOrderById(pendingOrderId)
          .then((ord) => {
            if (ord && ord.orderStatus === "pending") {
              setOrder(ord);
            }
          })
          .catch((err) => console.warn("Could not load pending order:", err))
          .finally(() => setLoadingOrder(false));
      } else {
        setLoadingOrder(false);
      }
    }
  }, [order]);

  const displayTotal = order?.totalAmount || grandTotal;

  if (loadingOrder) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: "80px 0" }}>
        <div className="verifying-spinner" />
        <p className="muted">Retrieving order details...</p>
      </div>
    );
  }

  if (!order && items.length === 0) {
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

  // --- SUBMIT PAYMENT ---
  async function handleStartPayment(e) {
    e.preventDefault();
    setErrorMessage("");

    if (paymentMethod === "upi" && !upiId.includes("@")) {
      setErrorMessage("Please provide a valid UPI ID (e.g. name@okhdfcbank).");
      return;
    }
    if (paymentMethod === "card" && (!cardNumber || cardNumber.replace(/\s/g, "").length < 16)) {
      setErrorMessage("Please provide a valid 16-digit card number.");
      return;
    }

    setPaymentState("initiating");

    try {
      const orderId = order?.orderId || sessionStorage.getItem("kavya_pending_order_id");
      if (!orderId) {
        throw new Error("Missing active order. Please return to Checkout.");
      }

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

      // Step 1: Initiate initial payment in Firestore (paymentStatus = 'pending')
      // and retrieve server-side payment intent signature
      const initResult = await initiatePayment({
        orderId,
        amount: displayTotal,
        provider,
        paymentMethod: methodLabel,
        customerId: userProfile?.customerId || order?.customerId,
        userId: currentUser?.uid,
      });

      setActivePaymentRecord(initResult);

      // Check simulated test outcomes
      if (simulateOutcome === "cancelled") {
        setPaymentState("cancelled");
        await handlePaymentCancellation({
          orderId,
          paymentId: initResult.paymentId,
        });
        return;
      }

      if (simulateOutcome === "failure") {
        setPaymentState("failed");
        setErrorMessage("Card declined: Insufficient funds or issuer security rejection.");
        await handlePaymentFailure({
          orderId,
          paymentId: initResult.paymentId,
          reason: "Card declined by issuing bank (Simulated Failure)",
        });
        return;
      }

      // Step 2: Step to secure server verification
      setPaymentState("verifying");

      const providerPaymentId =
        paymentMethod === "upi"
          ? `UPI-${Date.now()}`
          : paymentMethod === "card"
          ? `CARD-TXN-${Date.now()}`
          : `COD-TXN-${Date.now()}`;

      // Step 3: Trigger Server Verification Endpoint (Strict Security check)
      const verifyRes = await verifyPaymentTransaction({
        orderId,
        paymentId: initResult.paymentId,
        amount: displayTotal,
        customerId: userProfile?.customerId || order?.customerId,
        provider,
        providerPaymentId,
        paymentMethod: methodLabel,
        signature: initResult.signature,
      });

      if (!verifyRes.success) {
        if (verifyRes.isNetworkError) {
          setPaymentState("network_error");
          setErrorMessage("Network connection timed out during verification.");
        } else {
          setPaymentState("failed");
          setErrorMessage(verifyRes.error || "Payment verification declined by server.");
          await handlePaymentFailure({
            orderId,
            paymentId: initResult.paymentId,
            reason: verifyRes.error,
          });
        }
        return;
      }

      // Step 4: Verification confirmed on server!
      // Clear cart, clean session storage, and route to confirmation
      clearCart();
      sessionStorage.removeItem("kavya_pending_order_id");

      navigate(`/order-confirmation/${orderId}`, {
        state: {
          order: {
            ...order,
            orderId,
            orderStatus: "confirmed",
            paymentStatus: "paid",
            paymentId: initResult.paymentId,
            totalAmount: displayTotal,
          },
          payment: {
            paymentId: initResult.paymentId,
            orderId,
            amount: displayTotal,
            paymentStatus: "paid",
          },
        },
      });
    } catch (err) {
      console.error("Payment initiation error:", err);
      setPaymentState("failed");
      setErrorMessage(err.message || "An unexpected error occurred during payment.");
    }
  }

  // --- RETRY PAYMENT ---
  async function handleRetryPayment() {
    setErrorMessage("");
    setPaymentState("idle");
    setSimulateOutcome("success");

    const orderId = order?.orderId || sessionStorage.getItem("kavya_pending_order_id");
    if (orderId) {
      try {
        await retryPaymentForOrder({
          orderId,
          customerId: userProfile?.customerId || order?.customerId,
          userId: currentUser?.uid,
        });
      } catch (err) {
        console.warn("Could not reset order for retry:", err.message);
      }
    }
  }

  // --- RE-VERIFY EXISTING PAYMENT (Network Error Recovery) ---
  async function handleReverifyNetworkError() {
    if (!activePaymentRecord) {
      handleRetryPayment();
      return;
    }

    setPaymentState("verifying");
    setErrorMessage("");

    const orderId = order?.orderId || sessionStorage.getItem("kavya_pending_order_id");
    const verifyRes = await verifyPaymentTransaction({
      orderId,
      paymentId: activePaymentRecord.paymentId,
      amount: displayTotal,
      customerId: userProfile?.customerId || order?.customerId,
      provider: activePaymentRecord.provider,
      providerPaymentId: `RETRY-TXN-${Date.now()}`,
      paymentMethod: activePaymentRecord.paymentMethod,
      signature: activePaymentRecord.signature,
    });

    if (verifyRes.success) {
      clearCart();
      sessionStorage.removeItem("kavya_pending_order_id");
      navigate(`/order-confirmation/${orderId}`, {
        state: {
          order: {
            ...order,
            orderId,
            orderStatus: "confirmed",
            paymentStatus: "paid",
            paymentId: activePaymentRecord.paymentId,
            totalAmount: displayTotal,
          },
          payment: {
            paymentId: activePaymentRecord.paymentId,
            orderId,
            amount: displayTotal,
            paymentStatus: "paid",
          },
        },
      });
    } else {
      if (verifyRes.isNetworkError) {
        setPaymentState("network_error");
        setErrorMessage("Network still unreachable. Please check your connection.");
      } else {
        setPaymentState("failed");
        setErrorMessage(verifyRes.error);
      }
    }
  }

  // --- USER EXPLICIT CANCEL ---
  async function handleUserCancel() {
    const orderId = order?.orderId || sessionStorage.getItem("kavya_pending_order_id");
    if (orderId && activePaymentRecord?.paymentId) {
      await handlePaymentCancellation({
        orderId,
        paymentId: activePaymentRecord.paymentId,
      });
    }
    setPaymentState("cancelled");
  }

  // Render Verification Loading Screen
  if (paymentState === "verifying" || paymentState === "initiating") {
    return (
      <div className="container section" style={{ maxWidth: "600px", margin: "60px auto" }}>
        <div className="payment-verifying-card card">
          <div className="verifying-spinner" />
          <h3>Verifying Payment with Secure Server...</h3>
          <p className="muted" style={{ margin: "12px 0 24px" }}>
            {paymentState === "initiating"
              ? "Connecting with payment gateway and creating cryptographic intent..."
              : "Validating signature and verifying transaction integrity on secure server..."}
          </p>
          <div className="security-guarantee muted" style={{ fontSize: "12px" }}>
            🔒 Bank-Grade 256-Bit SSL Verification • Please do not refresh this page
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container container section">
      <div className="payment-header">
        <h2>Select Payment Method</h2>
        <p className="muted">
          Pay ₹{displayTotal.toLocaleString("en-IN")} securely to confirm your gift hamper booking
        </p>
      </div>

      {/* ERROR RECOVERY: PAYMENT FAILED */}
      {paymentState === "failed" && (
        <div className="payment-recovery-card">
          <div className="recovery-header">
            <span className="recovery-icon">⚠️</span>
            <div>
              <h3 style={{ margin: 0, color: "#b91c1c" }}>Payment Failed</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {errorMessage || "Your bank or payment provider declined the transaction."}
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13.5px", margin: "8px 0" }}>
            Don't worry, your hamper booking details are safely saved as a pending order.
          </p>
          <div className="recovery-actions">
            <button type="button" onClick={handleRetryPayment} className="btn btn-primary btn-pill">
              🔄 Retry Payment
            </button>
            <Link to="/checkout" className="btn btn-secondary btn-pill">
              Edit Delivery Details
            </Link>
          </div>
        </div>
      )}

      {/* ERROR RECOVERY: PAYMENT CANCELLED */}
      {paymentState === "cancelled" && (
        <div className="payment-recovery-card cancelled">
          <div className="recovery-header">
            <span className="recovery-icon">🛑</span>
            <div>
              <h3 style={{ margin: 0, color: "#d97706" }}>Payment Cancelled</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                You cancelled the payment transaction.
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13.5px", margin: "8px 0" }}>
            Your order remains saved in pending status. You can retry whenever you are ready.
          </p>
          <div className="recovery-actions">
            <button type="button" onClick={handleRetryPayment} className="btn btn-primary btn-pill">
              ⚡ Resume & Retry Payment
            </button>
            <Link to="/" className="btn btn-secondary btn-pill">
              Return to Catalog
            </Link>
          </div>
        </div>
      )}

      {/* ERROR RECOVERY: NETWORK ERROR */}
      {paymentState === "network_error" && (
        <div className="payment-recovery-card network">
          <div className="recovery-header">
            <span className="recovery-icon">📡</span>
            <div>
              <h3 style={{ margin: 0, color: "#2563eb" }}>Network Interruption</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                We lost connection while verifying with the payment server.
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13.5px", margin: "8px 0" }}>
            If funds were deducted, click <strong>Re-Verify Payment</strong> below to verify your receipt with the server without re-charging.
          </p>
          <div className="recovery-actions">
            <button type="button" onClick={handleReverifyNetworkError} className="btn btn-primary btn-pill">
              🔍 Re-Verify Payment Status
            </button>
            <button type="button" onClick={handleRetryPayment} className="btn btn-secondary btn-pill">
              Try Another Payment Method
            </button>
          </div>
        </div>
      )}

      {errorMessage && paymentState === "idle" && (
        <div className="checkout-alert error">{errorMessage}</div>
      )}

      <div className="payment-grid">
        {/* Payment Methods */}
        <div className="payment-methods-card card">
          <form onSubmit={handleStartPayment}>
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
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = digits.match(/.{1,4}/g)?.join(" ") || digits;
                      setCardNumber(formatted);
                    }}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (digits.length >= 3) {
                          setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
                        } else {
                          setCardExpiry(digits);
                        }
                      }}
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
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
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

            {/* Developer Testing Controls: Quick toggles for verifying error recovery flows */}
            <div className="simulate-testing-options">
              <span style={{ fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Payment Outcome Simulator (Testing):
              </span>
              <label>
                <input
                  type="radio"
                  name="outcome"
                  value="success"
                  checked={simulateOutcome === "success"}
                  onChange={() => setSimulateOutcome("success")}
                />
                Success (Verify via server)
              </label>
              <label>
                <input
                  type="radio"
                  name="outcome"
                  value="failure"
                  checked={simulateOutcome === "failure"}
                  onChange={() => setSimulateOutcome("failure")}
                />
                Simulate Payment Failure
              </label>
              <label>
                <input
                  type="radio"
                  name="outcome"
                  value="cancelled"
                  checked={simulateOutcome === "cancelled"}
                  onChange={() => setSimulateOutcome("cancelled")}
                />
                Simulate Payment Cancellation
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="submit"
                className="btn btn-primary btn-pill"
                style={{ flex: 1 }}
              >
                Pay ₹{displayTotal.toLocaleString("en-IN")} & Verify
              </button>
              <button
                type="button"
                onClick={handleUserCancel}
                className="btn btn-secondary btn-pill"
              >
                Cancel
              </button>
            </div>
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

            {order?.orderId && (
              <p className="muted" style={{ fontSize: "12.5px", marginTop: "6px" }}>
                Order Ref: <strong>{order.orderId}</strong> (Status: {order.orderStatus || "pending"})
              </p>
            )}

            {(giftWrap?.enabled || order?.giftWrap?.enabled) && (
              <div className="gift-wrap-recap">
                <span className="wrap-tag">
                  🎁 {giftWrap?.optionName || order?.giftWrap?.optionName || "Gift Wrapping"}
                </span>
                {(giftWrap?.message || order?.giftWrap?.message) && (
                  <p className="recap-message">
                    "{giftWrap?.message || order?.giftWrap?.message}"
                  </p>
                )}
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px dashed rgba(122, 31, 43, 0.2)", margin: "16px 0" }} />

            <div className="recap-pricing">
              <div className="recap-row">
                <span>Hampers Total:</span>
                <span>₹{(order?.subtotal || subtotal).toLocaleString("en-IN")}</span>
              </div>
              {(order?.giftWrappingTotal || giftWrapFee) > 0 && (
                <div className="recap-row">
                  <span>Gift Wrapping:</span>
                  <span>₹{(order?.giftWrappingTotal || giftWrapFee).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="recap-row total">
                <strong>Total Payable:</strong>
                <strong style={{ color: "var(--color-primary)", fontSize: "18px" }}>
                  ₹{displayTotal.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
