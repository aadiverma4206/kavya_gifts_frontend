import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { loadFullCustomerDashboardHistory } from "../../controllers/historyController.js";
import { toDirectImageUrl } from "../../utils/driveImage.js";
import useDocumentTitle from "../../hooks/useDocumentTitle.js";
import "./CustomerDashboard.css";

export default function CustomerDashboard() {
  useDocumentTitle("Customer Portal - Kavya Luxury Gifts");
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'payments' | 'reviews' | 'activity'
  const [data, setData] = useState({
    orders: [],
    payments: [],
    reviews: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const customerId = userProfile?.customerId;
    const userId = currentUser?.uid;

    if (customerId || userId) {
      setLoading(true);
      loadFullCustomerDashboardHistory(customerId, userId)
        .then((res) => {
          if (isMounted) setData(res);
        })
        .catch((err) => console.error("Error loading dashboard history:", err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [userProfile, currentUser]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const { orders, payments, reviews, activities } = data;

  return (
    <div className="dashboard-container container section">
      {/* Welcome Hero Banner */}
      <div className="dashboard-hero card">
        <div className="dashboard-hero-content">
          <span className="customer-badge">
            Customer ID: {userProfile?.customerId || "CUS-10001"}
          </span>
          <h2>Welcome, {userProfile?.fullName || currentUser?.email}</h2>
          <p className="muted">
            Track your bespoke hampers, verified payments, unboxing reviews, and personal activity log in one secure hub.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/" className="btn btn-primary">
            Explore Catalog
          </Link>
          <Link to="/profile" className="btn btn-secondary">
            Account & Security
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {/* Quick Stat Summary Cards */}
      <div className="dashboard-grid">
        <div className="dash-card card" onClick={() => setActiveTab("orders")} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">🎁</div>
          <div className="dash-card-text">
            <h3>{orders.length} {orders.length === 1 ? "Order" : "Orders"}</h3>
            <p className="muted">Total bookings placed</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "orders" ? "●" : "→"}</span>
        </div>

        <div className="dash-card card" onClick={() => setActiveTab("payments")} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">💳</div>
          <div className="dash-card-text">
            <h3>{payments.length} {payments.length === 1 ? "Payment" : "Payments"}</h3>
            <p className="muted">Verified ledger records</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "payments" ? "●" : "→"}</span>
        </div>

        <div className="dash-card card" onClick={() => setActiveTab("reviews")} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">★</div>
          <div className="dash-card-text">
            <h3>{reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}</h3>
            <p className="muted">Hamper unboxing feedback</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "reviews" ? "●" : "→"}</span>
        </div>
      </div>

      {/* HISTORY MANAGEMENT TABS */}
      <div className="history-section card" style={{ padding: "32px" }}>
        <div className="history-tabs-nav">
          <button
            type="button"
            className={`history-tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span>🎁</span> Order History
            <span className="tab-count-badge">{orders.length}</span>
          </button>

          <button
            type="button"
            className={`history-tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <span>💳</span> Payment History
            <span className="tab-count-badge">{payments.length}</span>
          </button>

          <button
            type="button"
            className={`history-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <span>★</span> Review History
            <span className="tab-count-badge">{reviews.length}</span>
          </button>

          <button
            type="button"
            className={`history-tab-btn ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <span>📋</span> Activity History
            <span className="tab-count-badge">{activities.length}</span>
          </button>
        </div>

        {loading && <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>Loading history records...</p>}

        {/* --- TAB 1: ORDER HISTORY --- */}
        {!loading && activeTab === "orders" && (
          <div className="history-tab-content">
            {orders.length === 0 ? (
              <div className="empty-dash-card">
                <p className="muted">You have no order history yet.</p>
                <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: "12px" }}>
                  Start Gifting
                </Link>
              </div>
            ) : (
              <div className="history-list">
                {orders.map((ord) => (
                  <div key={ord.orderId} className="history-card">
                    <div className="history-card-header">
                      <div>
                        <span className="history-ref-badge">{ord.orderId}</span>
                        <span className="history-date" style={{ marginLeft: "12px" }}>
                          {ord.date.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <span className={`status-pill ${ord.orderStatus || "pending"}`}>
                          {ord.orderStatus === "confirmed" ? "✓ Confirmed" : `Status: ${ord.orderStatus}`}
                        </span>
                        <span className={`status-pill ${ord.paymentStatus === "paid" ? "delivered" : "placed"}`}>
                          {ord.paymentStatus === "paid" ? "Paid" : `Payment: ${ord.paymentStatus}`}
                        </span>
                      </div>
                    </div>

                    <div className="history-card-body">
                      <div className="products-summary-chips">
                        {ord.products.map((p, idx) => (
                          <div key={idx} className="product-chip">
                            {p.image && <img src={toDirectImageUrl(p.image)} alt={p.productName} />}
                            <strong>{p.productName}</strong>
                            <span className="muted">×{p.quantity}</span>
                            {p.giftWrappingSelected && <span className="wrap-pill">Wrapped</span>}
                          </div>
                        ))}
                      </div>

                      <p className="muted" style={{ fontSize: "13px", margin: "6px 0" }}>
                        📍 <strong>Delivery Address:</strong> {ord.deliveryAddress || "Standard Delivery"}
                      </p>
                    </div>

                    <div className="history-card-footer">
                      <div>
                        <span className="muted">Order Total: </span>
                        <strong style={{ color: "var(--color-primary)", fontSize: "16px" }}>
                          ₹{ord.total.toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {ord.products[0]?.productId && (
                          <Link
                            to={`/review/${ord.products[0].productId}`}
                            state={{ productName: ord.products[0].productName }}
                            className="btn btn-secondary btn-sm"
                          >
                            ★ Write Review
                          </Link>
                        )}
                        <Link to={`/order-confirmation/${ord.orderId}`} className="btn btn-secondary btn-sm">
                          Order Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: PAYMENT HISTORY --- */}
        {!loading && activeTab === "payments" && (
          <div className="history-tab-content">
            {payments.length === 0 ? (
              <div className="empty-dash-card">
                <p className="muted">No payment records found.</p>
              </div>
            ) : (
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Order ID</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.paymentId}>
                        <td><strong>{p.paymentId}</strong></td>
                        <td>
                          <Link to={`/order-confirmation/${p.orderId}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                            {p.orderId}
                          </Link>
                        </td>
                        <td>₹{p.amount.toLocaleString("en-IN")}</td>
                        <td>{p.method}</td>
                        <td>
                          <span className="auth-tag" style={{ fontSize: "11px", padding: "2px 8px" }}>
                            {p.provider}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${p.status === "paid" ? "delivered" : p.status === "failed" ? "cancelled" : "placed"}`}>
                            {p.status === "paid" ? "✓ Paid" : p.status}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: "13px" }}>
                          {p.date.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: REVIEW HISTORY --- */}
        {!loading && activeTab === "reviews" && (
          <div className="history-tab-content">
            {reviews.length === 0 ? (
              <div className="empty-dash-card">
                <p className="muted">You haven't submitted any product reviews yet.</p>
                <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                  Reviews can be submitted after purchasing any handcrafted gift hamper.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {reviews.map((rev) => (
                  <div key={rev.reviewId} className="history-card">
                    <div className="history-card-header">
                      <div>
                        <strong style={{ fontSize: "16px", color: "var(--color-primary)" }}>
                          {rev.product}
                        </strong>
                        <span className="history-date" style={{ marginLeft: "12px" }}>
                          {rev.date.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                          {"★".repeat(Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 0))))} ({rev.rating}/5)
                        </span>
                        <span className={`status-pill ${rev.status === "approved" ? "delivered" : "placed"}`}>
                          {rev.status}
                        </span>
                      </div>
                    </div>

                    <div className="history-card-body" style={{ marginTop: "8px" }}>
                      {rev.title && (
                        <h4 style={{ margin: "0 0 6px", fontSize: "15px", color: "var(--color-text)" }}>
                          {rev.title}
                        </h4>
                      )}
                      <p className="muted" style={{ margin: 0, fontSize: "13.5px" }}>
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="history-card-footer">
                      <span className="muted" style={{ fontSize: "12px" }}>
                        Review ID: {rev.reviewId}
                      </span>
                      <Link
                        to={`/review/${rev.productId}`}
                        state={{ productName: rev.product }}
                        className="btn btn-secondary btn-sm"
                      >
                        ✎ Edit Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: ACTIVITY HISTORY --- */}
        {!loading && activeTab === "activity" && (
          <div className="history-tab-content">
            {activities.length === 0 ? (
              <div className="empty-dash-card">
                <p className="muted">No recent activity logged for your account.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {activities.map((act) => (
                  <div key={act.activityId} className="activity-item">
                    <span className={`activity-badge ${act.action}`}>
                      {act.action}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>
                        {act.description}
                      </p>
                      <span className="history-date">
                        {act.date.toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
