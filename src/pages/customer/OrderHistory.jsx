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
                {ord.items?.map((item, idx) => {
                  const pId = item.productId || item.product_id;
                  const pName = item.productName || item.product_name || "Gift Hamper";
                  const pImg = item.thumbnail || item.image || item.image_url || (Array.isArray(item.images) && item.images[0]);
                  return (
                    <div key={idx} className="order-item-tile">
                      <img
                        src={toDirectImageUrl(pImg) || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E"}
                        alt={pName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";
                        }}
                      />
                      <div className="order-item-desc">
                        <h4>{pName}</h4>
                        <p className="muted">
                          Qty: {item.quantity} • ₹{Number(item.price || 0).toLocaleString("en-IN")} each
                        </p>
                        {pId && (
                          <Link
                            to={`/review/${pId}`}
                            state={{ productName: pName, orderId: ord.orderId }}
                            className="review-btn-link"
                          >
                            ★ Write Product Review
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Footer */}
              <div className="order-card-footer">
                <div className="delivery-summary">
                  <span className="muted">Delivering To:</span>{" "}
                  <strong>{ord.customer?.name || ord.customerSnapshot?.name || "Customer"}</strong>,{" "}
                  {ord.customer?.address || ord.customerSnapshot?.address || ord.deliveryAddress || "Address provided"}
                </div>
                <div className="order-total-summary">
                  <span>Total:</span>
                  <strong className="order-total-amt">
                    ₹{Number(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}
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
