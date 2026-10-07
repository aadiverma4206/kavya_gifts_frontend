import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getOrdersByCustomer } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import "./OrderHistory.css";

export default function OrderHistory() {
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idToQuery = userProfile?.customerId || currentUser?.uid;
    if (idToQuery) {
      getOrdersByCustomer(idToQuery)
        .then((data) => setOrders(data))
        .finally(() => setLoading(false));
    }
  }, [currentUser, userProfile]);

  return (
    <div className="orders-container container section">
      <div className="orders-header">
        <div>
          <h2>Order History</h2>
          <p className="muted">
            Track your bespoke hampers, delivery milestones, and leave product reviews
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {loading && <p className="muted">Loading your orders...</p>}

      {!loading && orders.length === 0 && (
        <div className="card empty-orders-card">
          <span style={{ fontSize: "40px" }}>🎁</span>
          <h3>No Orders Found</h3>
          <p className="muted">You haven't placed any gift hamper bookings yet.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
            Explore Hampers
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="orders-cards-list">
          {orders.map((ord) => (
            <div key={ord.id} className="card order-card">
              {/* Card Header */}
              <div className="order-card-header">
                <div className="order-meta">
                  <span className="order-id-badge">{ord.orderId}</span>
                  <span className="order-date muted">
                    {ord.createdAt?.toDate
                      ? ord.createdAt.toDate().toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently placed"}
                  </span>
                </div>
                <div className="order-status-group">
                  <span className={`status-pill ${ord.orderStatus || "pending"}`}>
                    {ord.orderStatus === "confirmed" ? "✓ Confirmed" : `Status: ${ord.orderStatus || "pending"}`}
                  </span>
                  <span className={`payment-pill ${ord.paymentStatus || "pending"}`}>
                    {ord.paymentStatus === "paid" || ord.paymentStatus === "completed"
                      ? "✓ Paid"
                      : ord.paymentStatus === "pending"
                      ? "Pending"
                      : ord.paymentStatus === "failed"
                      ? "Failed"
                      : ord.paymentStatus === "cancelled"
                      ? "Cancelled"
                      : ord.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Gift Wrap Highlight */}
              {ord.giftWrap?.enabled && (
                <div className="order-card-giftwrap">
                  <span>🎁 Gift Wrap: <strong>{ord.giftWrap.optionName}</strong></span>
                  {ord.giftWrap.recipientName && (
                    <span> • Recipient: <strong>{ord.giftWrap.recipientName}</strong></span>
                  )}
                  {ord.giftWrap.message && (
                    <p className="order-gift-msg">"{ord.giftWrap.message}"</p>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="order-items-grid">
                {ord.items?.map((item, idx) => (
                  <div key={idx} className="order-item-tile">
                    <img src={toDirectImageUrl(item.image_url)} alt={item.product_name} />
                    <div className="order-item-desc">
                      <h4>{item.product_name}</h4>
                      <p className="muted">
                        Qty: {item.quantity} • ₹{item.price.toLocaleString("en-IN")} each
                      </p>
                      <Link
                        to={`/review/${item.product_id}`}
                        state={{ productName: item.product_name, orderId: ord.orderId }}
                        className="review-btn-link"
                      >
                        ★ Write Product Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="order-card-footer">
                <div className="delivery-summary">
                  <span className="muted">Delivering To:</span>{" "}
                  <strong>{ord.customer?.name}</strong>, {ord.customer?.address}
                </div>
                <div className="order-total-summary">
                  <span>Total:</span>
                  <strong className="order-total-amt">
                    ₹{ord.total?.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
