import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { getOrderById } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatCurrency } from "../../utils/formatters";
import "./OrderConfirmation.css";

const DEFAULT_HAMPER_FALLBACK_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Safely copies specified text to clipboard with legacy document.execCommand fallback.
 * @param {string} text - Content string to copy.
 * @param {Function} [onSuccess] - Callback executed on successful copy.
 * @param {Function} [onError] - Callback executed on failure.
 */
async function copyToClipboard(text, onSuccess, onError) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
    if (onSuccess) onSuccess();
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * Computes estimated delivery date (+3 business days from order creation).
 * @param {Date|Object|string|number} createdAt - Order timestamp.
 * @returns {string} Formatted localized delivery date estimate.
 */
function getEstimatedDeliveryDate(createdAt) {
  if (!createdAt) return "Within 3 business days";
  const date = createdAt?.toDate ? createdAt.toDate() : (createdAt?.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt || 0));
  if (isNaN(date.getTime())) return "Within 3 business days";
  const eta = new Date(date);
  eta.setDate(eta.getDate() + 3);
  return eta.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function OrderConfirmation() {
  useDocumentTitle("Order Confirmation - Kavya Luxury Gifts");
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);

  useEffect(() => {
    if (!order && orderId) {
      getOrderById(orderId)
        .then((data) => setOrder(data))
        .catch((err) => {
          console.warn("Could not retrieve order details:", err);
          setOrder(null);
        })
        .finally(() => setLoading(false));
    }
  }, [order, orderId]);

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: "80px 0" }}>
        <p className="muted">Fetching order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h2>Order Not Found</h2>
        <p className="muted" style={{ margin: "16px 0 24px" }}>
          We could not locate this order.
        </p>
        <Link to="/" className="btn btn-primary">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="confirmation-container container section">
      <div className="confirmation-card card">
        <div className="confirmation-badge">✓ Booking Confirmed</div>
        <h2>Thank You for Gifting with Kavya!</h2>
        <p className="muted confirmation-subtitle">
          Your gift hamper has been booked successfully and is being handcrafted with love.
        </p>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", margin: "12px 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📧</span>
          <span>
            A detailed invoice & receipt has been dispatched to <strong>{order.customerSnapshot?.email || order.customer?.email || "your registered email"}</strong>.
          </span>
        </div>

        {/* Highlighted Order and Payment Reference */}
        <div className="reference-badges-row">
          <div className="reference-box">
            <span className="ref-label">Order Reference</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong className="ref-val">{order.orderId}</strong>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    order.orderId,
                    () => toast.success("Order ID copied to clipboard!"),
                    () => toast.error("Could not copy order ID")
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px",
                }}
                title="Copy Order ID"
                aria-label="Copy Order ID"
              >
                📋
              </button>
            </div>
          </div>
          {order.paymentId && (
            <div className="reference-box">
              <span className="ref-label">Payment Reference</span>
              <strong className="ref-val">{order.paymentId}</strong>
            </div>
          )}
          <div className="reference-box">
            <span className="ref-label">Order Status</span>
            <span className={`status-pill ${order.orderStatus || "confirmed"}`}>
              {order.orderStatus === "confirmed" ? "✓ Confirmed" : order.orderStatus}
            </span>
          </div>
          <div className="reference-box">
            <span className="ref-label">Estimated Delivery</span>
            <strong className="ref-val" style={{ color: "#166534" }}>
              🚚 {getEstimatedDeliveryDate(order.createdAt || Date.now())}
            </strong>
          </div>
        </div>

        {/* Gift Wrapping Details */}
        {order.giftWrap?.enabled && (
          <div className="gift-wrap-summary-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <h4 style={{ margin: 0 }}>🎁 {order.giftWrap.optionName} Included</h4>
              <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                Complimentary Luxury Finish
              </span>
            </div>
            {order.giftWrap.recipientName && (
              <p><strong>For:</strong> {order.giftWrap.recipientName}</p>
            )}
            {order.giftWrap.message && (
              <p className="custom-note">"{order.giftWrap.message}"</p>
            )}
          </div>
        )}

        {/* Concierge Desk Callout */}
        <div style={{ background: "#fdfaf6", border: "1px solid #ebd9c8", borderRadius: "8px", padding: "12px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "13px", color: "var(--color-text)" }}>
            ✨ Need special packaging customization or delivery rescheduling?
          </div>
          <a
            href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hello Concierge Desk, I need assistance with Order #${order.orderId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "12.5px", color: "var(--color-primary)", fontWeight: 700, textDecoration: "underline" }}
          >
            💬 Contact Concierge Desk →
          </a>
        </div>

        {/* Delivery Address & Items */}
        <div className="confirmation-details-grid">
          <div className="detail-col">
            <h4>Delivery Address</h4>
            <p><strong>{order.customerSnapshot?.name || order.customer?.name}</strong></p>
            <p className="muted">{order.deliveryAddress || order.customer?.address}</p>
            <p className="muted">
              📞{" "}
              <a
                href={`tel:${String(order.customerSnapshot?.mobile || order.customer?.phone || "").replace(/[^\d+]/g, "")}`}
                style={{ color: "inherit", textDecoration: "underline" }}
                title="Call recipient"
              >
                {order.customerSnapshot?.mobile || order.customer?.phone}
              </a>
            </p>
            {(order.deliveryNotes || order.specialInstructions || order.notes || order.customer?.notes) && (
              <p style={{ fontSize: "12px", color: "var(--color-muted)", fontStyle: "italic", marginTop: "6px" }}>
                📝 Instructions: "{order.deliveryNotes || order.specialInstructions || order.notes || order.customer?.notes}"
              </p>
            )}
          </div>

          <div className="detail-col">
            <h4>Payment Verification</h4>
            <p>Method: <strong>{order.paymentMethod || "Online"}</strong></p>
            <p>
              Status:{" "}
              <strong style={{ color: order.paymentStatus === "paid" ? "#166534" : "#92400e" }}>
                {order.paymentStatus === "paid" ? "✓ Verified & Paid" : order.paymentStatus}
              </strong>
            </p>
            <p className="total-highlight">
              Total Paid: {formatCurrency(order.totalAmount || order.total || 0)}
            </p>
          </div>
        </div>

        {/* Itemized List */}
        <div className="items-breakdown">
          <h4>Hamper Details ({order.items?.length || 0} {(order.items?.length || 0) === 1 ? "hamper" : "hampers"})</h4>
          <div className="items-list">
            {order.items?.map((it, idx) => {
              const itemImg = it.image_url || it.thumbnail || it.image || (Array.isArray(it.images) && it.images[0]);
              const itemName = it.productName || it.product_name || "Gift Hamper";
              return (
                <div key={idx} className="item-row">
                  <img
                    src={toDirectImageUrl(itemImg) || DEFAULT_HAMPER_FALLBACK_SVG}
                    alt={itemName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_HAMPER_FALLBACK_SVG;
                    }}
                  />
                  <div className="item-info">
                    <strong>{itemName}</strong>
                    <span className="muted">Qty: {it.quantity}</span>
                  </div>
                  <strong>{formatCurrency(Number(it.price || 0) * Number(it.quantity || 1))}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="confirmation-actions">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`I just booked a luxury gift hamper with Kavya Luxury Gifts! Order Ref: #${order.orderId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            title="Share booking with friends or recipient on WhatsApp"
          >
            💬 Share on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary"
            title="Print booking confirmation receipt"
          >
            🖨️ Print Receipt
          </button>
          <Link to="/orders" className="btn btn-primary">
            Track in Order History
          </Link>
          <Link to="/" className="btn btn-secondary">
            Send Another Hamper
          </Link>
        </div>
      </div>
    </div>
  );
}
