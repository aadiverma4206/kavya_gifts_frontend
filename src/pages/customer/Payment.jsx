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

/**
 * Validates a payment card number using the standard Luhn checksum algorithm (Mod 10).
 * @param {string} number - Raw card number string.
 * @returns {boolean} True if card number passes Luhn check.
 */
function isValidLuhn(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Detects the payment card network brand (Visa, Mastercard, RuPay, Amex, Maestro) based on IIN prefix.
 * @param {string} number - Card digits string.
 * @returns {string} Detected network name.
 */
function detectCardNetwork(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "Card";
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^(508|60|65|81|82)/.test(digits)) return "RuPay";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(50|5[6-8]|6\d)/.test(digits)) return "Maestro";
  return "Card";
}

/**
 * Validates a card expiration date string in MM/YY format against current month/year.
 * @param {string} expiry - Expiry formatted as MM/YY.
 * @returns {{ valid: boolean, error?: string }} Validation result.
 */
function validateCardExpiry(expiry) {
  if (!expiry || typeof expiry !== "string") {
    return { valid: false, error: "Please enter card expiry date (MM/YY)." };
  }
  const parts = expiry.trim().split("/");
  if (parts.length !== 2) {
    return { valid: false, error: "Expiry format must be MM/YY." };
  }
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (isNaN(month) || month < 1 || month > 12) {
    return { valid: false, error: "Expiry month must be between 01 and 12." };
  }
  if (isNaN(year) || year < 0) {
    return { valid: false, error: "Invalid expiry year." };
  }
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, error: "This card has already expired." };
  }
  return { valid: true };
}

/**
 * Formats a raw card number string with network-aware spacing (4-6-5 for Amex, 4-4-4-4 for others).
 * @param {string} raw - Raw input digits.
 * @returns {string} Formatted card string.
 */
function formatCardNumberInput(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 19);
  if (/^3[47]/.test(digits)) {
    const part1 = digits.slice(0, 4);
    const part2 = digits.slice(4, 10);
    const part3 = digits.slice(10, 15);
    return [part1, part2, part3].filter(Boolean).join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") || digits;
}

/**
 * Safely retrieves an item from sessionStorage with error suppression for sandboxed/private browsing.
 * @param {string} key - Storage item key.
 * @returns {string|null} Retrieved value or null.
 */
function getSafeSessionStorage(key) {
  try {
    return window?.sessionStorage ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/**
 * Safely removes an item from sessionStorage.
 * @param {string} key - Storage item key.
 */
function removeSafeSessionStorage(key) {
  try {
    if (window?.sessionStorage) window.sessionStorage.removeItem(key);
  } catch {
    // Ignore quota or security restriction exceptions
  }
}

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
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [showItemsRecap, setShowItemsRecap] = useState(false);

  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (errorMessage) setErrorMessage("");
  };

  // Payment UI state machine: 'idle' | 'initiating' | 'verifying' | 'failed' | 'cancelled' | 'network_error'
  const [paymentState, setPaymentState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activePaymentRecord, setActivePaymentRecord] = useState(null);

  // Simulation controls for testing edge cases
  const [simulateOutcome, setSimulateOutcome] = useState("success"); // 'success' | 'failure' | 'cancelled'

  // Load existing pending order if navigated directly or refreshed
  useEffect(() => {
    if (!order) {
      const pendingOrderId = getSafeSessionStorage("kavya_pending_order_id");
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

    if (paymentMethod === "upi" && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      setErrorMessage("Please provide a valid UPI ID (e.g. name@okhdfcbank).");
      return;
    }
    if (paymentMethod === "card") {
      const digits = (cardNumber || "").replace(/\D/g, "");
      if (digits.length < 15 || digits.length > 19) {
        setErrorMessage("Please provide a valid card number (15-19 digits).");
        return;
      }
      if (!isValidLuhn(digits)) {
        setErrorMessage("Invalid card number. Please check the digits and try again.");
        return;
      }
      const expiryCheck = validateCardExpiry(cardExpiry);
      if (!expiryCheck.valid) {
        setErrorMessage(expiryCheck.error);
        return;
      }
      const cleanCvv = (cardCvv || "").replace(/\D/g, "");
      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        setErrorMessage("Please provide a valid 3 or 4-digit CVV.");
        return;
      }
    }

    setPaymentState("initiating");

    try {
      const pendingId = getSafeSessionStorage("kavya_pending_order_id");
      const orderId = order?.orderId || pendingId;
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
      removeSafeSessionStorage("kavya_pending_order_id");

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

    const orderId = order?.orderId || getSafeSessionStorage("kavya_pending_order_id");
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

    const orderId = order?.orderId || getSafeSessionStorage("kavya_pending_order_id");
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
      removeSafeSessionStorage("kavya_pending_order_id");
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
    const orderId = order?.orderId || getSafeSessionStorage("kavya_pending_order_id");
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
          {activePaymentRecord?.paymentId && (
            <div style={{ fontSize: "12px", background: "rgba(37, 99, 235, 0.08)", padding: "6px 10px", borderRadius: "var(--radius-xs)", color: "#1e40af", marginBottom: "12px" }}>
              🔑 Gateway Payment Intent: <code>{activePaymentRecord.paymentId}</code>
            </div>
          )}
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
              onClick={() => handleSelectPaymentMethod("upi")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "upi"}
                onChange={() => handleSelectPaymentMethod("upi")}
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
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {["@okhdfcbank", "@okicici", "@oksbi", "@okaxis", "@paytm"].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiId.includes("@") ? upiId.split("@")[0] : upiId;
                        setUpiId((prefix || "") + handle);
                      }}
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                        color: "var(--color-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
                <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
                  A payment authorization request will be sent to your UPI app.
                </span>
              </div>
            )}

            {/* Card Option */}
            <div
              className={`payment-option-row ${paymentMethod === "card" ? "active" : ""}`}
              onClick={() => handleSelectPaymentMethod("card")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "card"}
                onChange={() => handleSelectPaymentMethod("card")}
              />
              <div className="payment-option-info">
                <strong>Credit / Debit Card</strong>
                <p className="muted">Visa, Mastercard, RuPay, Amex</p>
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="payment-subform">
                {/* Dynamic Virtual Card Preview */}
                <div className="virtual-card-preview" aria-hidden="true">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="virtual-card-chip" />
                    <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "1px" }}>
                      {detectCardNetwork(cardNumber)}
                    </span>
                  </div>
                  <div className="virtual-card-number">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>
                  <div className="virtual-card-bottom">
                    <div>
                      <span style={{ fontSize: "9px", opacity: 0.8, display: "block" }}>CARDHOLDER</span>
                      <span>{cardName.trim() || "VALUED PATRON"}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "9px", opacity: 0.8, display: "block" }}>EXPIRES</span>
                      <span>{cardExpiry || "MM/YY"}</span>
                    </div>
                  </div>
                </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ margin: 0 }}>Card Number</label>
                    {cardNumber && detectCardNetwork(cardNumber) !== "Card" && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          background: "rgba(122, 31, 43, 0.08)",
                          padding: "1px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        💳 {detectCardNetwork(cardNumber)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      setCardNumber(formatCardNumberInput(e.target.value));
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ margin: 0 }}>CVV / CVC</label>
                      <span
                        title="3 digits on back of Visa/Mastercard/RuPay, or 4 digits on front of Amex"
                        style={{ fontSize: "11px", color: "var(--color-muted)", cursor: "help" }}
                        aria-label="3 digits on back of card or 4 digits on front for Amex"
                      >
                        ℹ️ 3-4 digits
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder="•••"
                      maxLength={detectCardNetwork(cardNumber) === "Amex" ? 4 : 3}
                      autoComplete="cc-csc"
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
              onClick={() => handleSelectPaymentMethod("netbanking")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "netbanking"}
                onChange={() => handleSelectPaymentMethod("netbanking")}
              />
              <div className="payment-option-info">
                <strong>Net Banking</strong>
                <p className="muted">All major Indian banks supported (HDFC, ICICI, SBI, Axis)</p>
              </div>
            </div>

            {paymentMethod === "netbanking" && (
              <div className="payment-subform">
                <label>Select Your Bank:</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginTop: "8px" }}>
                  {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Bank", "Other Bank"].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      style={{
                        padding: "8px 10px",
                        border: `1.5px solid ${selectedBank === bank ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: selectedBank === bank ? "rgba(122, 31, 43, 0.06)" : "#ffffff",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "12px",
                        fontWeight: selectedBank === bank ? 700 : 500,
                        color: selectedBank === bank ? "var(--color-primary)" : "var(--color-text)",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      🏛️ {bank}
                    </button>
                  ))}
                </div>
                <span className="muted" style={{ fontSize: "12px", display: "block", marginTop: "8px" }}>
                  You will be securely redirected to {selectedBank} gateway to authorize the transaction.
                </span>
              </div>
            )}

            {/* Cash / Pay on Delivery */}
            <div
              className={`payment-option-row ${paymentMethod === "cod" ? "active" : ""}`}
              onClick={() => handleSelectPaymentMethod("cod")}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === "cod"}
                onChange={() => handleSelectPaymentMethod("cod")}
              />
              <div className="payment-option-info">
                <strong>Pay on Delivery / Cash on Delivery</strong>
                <p className="muted">Pay via cash or UPI upon hamper doorstep delivery</p>
              </div>
            </div>

            {paymentMethod === "cod" && (
              <div className="payment-subform" style={{ background: "#fefdfa", border: "1.5px solid #fef3c7" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "20px" }}>📦</span>
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "#92400e" }}>Cash on Delivery Guidelines</strong>
                    <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0", lineHeight: "1.5" }}>
                      • Our courier executive will accept cash or instant UPI QR payment upon delivery.<br />
                      • An SMS verification passcode will be sent to <strong>{customerInfo.phone || "your mobile"}</strong> prior to delivery.<br />
                      • Zero additional handling charges for luxury hamper bookings.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Collapsible Order Items Summary */}
            {((order?.items && order.items.length > 0) || items.length > 0) && (
              <div style={{ marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowItemsRecap((prev) => !prev)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{showItemsRecap ? "▾ Hide Items in Order" : "▸ Review Items in Order"}</span>
                  <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                    ({(order?.items || items).length})
                  </span>
                </button>
                {showItemsRecap && (
                  <div style={{ marginTop: "8px", background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-xs)", padding: "8px 10px", fontSize: "12px" }}>
                    {(order?.items || items).map((it, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--color-text)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.productName || it.name || "Luxury Hamper"} × {it.quantity || 1}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          ₹{(Number(it.price || 0) * (it.quantity || 1)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              {Boolean(order?.discount || order?.discountAmount) && (
                <div className="recap-row" style={{ color: "#166534", fontWeight: 600 }}>
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}:</span>
                  <span>-₹{Number(order.discount || order.discountAmount || 0).toLocaleString("en-IN")}</span>
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
