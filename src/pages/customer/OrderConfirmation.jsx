import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { getOrderById } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import "./OrderConfirmation.css";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);

  useEffect(() => {
    if (!order && orderId) {
      getOrderById(orderId)
        .then((data) => setOrder(data))
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
            <strong className="ref-val">{order.orderId}</strong>
          </div>
          {order.paymentId && (
            <div className="reference-box">
              <span className="ref-label">Payment ID</span>
              <strong className="ref-val">{order.paymentId}</strong>
            </div>
          )}
          <div className="reference-box">
            <span className="ref-label">Order Status</span>
            <span className="status-pill placed">{order.orderStatus || "placed"}</span>
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
            <p><strong>{order.customer?.name}</strong></p>
            <p className="muted">{order.customer?.address}</p>
            <p className="muted">📞 {order.customer?.phone}</p>
          </div>

          <div className="detail-col">
            <h4>Payment Details</h4>
            <p>Method: <strong>{order.paymentMethod || "Online"}</strong></p>
            <p>Status: <strong style={{ color: "#166534" }}>{order.paymentStatus}</strong></p>
            <p className="total-highlight">Total Paid: ₹{order.total?.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Itemized List */}
        <div className="items-breakdown">
          <h4>Hamper Details</h4>
          <div className="items-list">
            {order.items?.map((it, idx) => (
              <div key={idx} className="item-row">
                <img src={toDirectImageUrl(it.image_url)} alt={it.product_name} />
                <div className="item-info">
                  <strong>{it.product_name}</strong>
                  <span className="muted">Qty: {it.quantity}</span>
                </div>
                <strong>₹{(it.price * it.quantity).toLocaleString("en-IN")}</strong>
              </div>
            ))}
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
