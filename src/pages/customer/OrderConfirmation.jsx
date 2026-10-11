import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { getOrderById } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./OrderConfirmation.css";

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

        {/* Highlighted Order and Payment Reference */}
        <div className="reference-badges-row">
          <div className="reference-box">
            <span className="ref-label">Order Reference</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong className="ref-val">{order.orderId}</strong>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.orderId);
                  toast.success("Order ID copied to clipboard!");
                }}
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
        </div>

        {/* Gift Wrapping Details */}
        {order.giftWrap?.enabled && (
          <div className="gift-wrap-summary-box">
            <h4>🎁 {order.giftWrap.optionName} Included</h4>
            {order.giftWrap.recipientName && (
              <p><strong>For:</strong> {order.giftWrap.recipientName}</p>
            )}
            {order.giftWrap.message && (
              <p className="custom-note">"{order.giftWrap.message}"</p>
            )}
          </div>
        )}

        {/* Delivery Address & Items */}
        <div className="confirmation-details-grid">
          <div className="detail-col">
            <h4>Delivery Address</h4>
            <p><strong>{order.customerSnapshot?.name || order.customer?.name}</strong></p>
            <p className="muted">{order.deliveryAddress || order.customer?.address}</p>
            <p className="muted">📞 {order.customerSnapshot?.mobile || order.customer?.phone}</p>
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
              Total Paid: ₹{(order.totalAmount || order.total || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Itemized List */}
        <div className="items-breakdown">
          <h4>Hamper Details</h4>
          <div className="items-list">
            {order.items?.map((it, idx) => {
              const itemImg = it.image_url || it.thumbnail || it.image || (Array.isArray(it.images) && it.images[0]);
              const itemName = it.productName || it.product_name || "Gift Hamper";
              return (
                <div key={idx} className="item-row">
                  <img
                    src={toDirectImageUrl(itemImg) || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E"}
                    alt={itemName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";
                    }}
                  />
                  <div className="item-info">
                    <strong>{itemName}</strong>
                    <span className="muted">Qty: {it.quantity}</span>
                  </div>
                  <strong>₹{(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString("en-IN")}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="confirmation-actions">
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
