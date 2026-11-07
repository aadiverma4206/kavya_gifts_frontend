import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";
import { loadFullCustomerDashboardHistory } from "../../controllers/historyController.js";
import { toDirectImageUrl } from "../../utils/driveImage.js";
import useDocumentTitle from "../../hooks/useDocumentTitle.js";
import { formatCurrency } from "../../utils/formatters.js";
import "./CustomerDashboard.css";

/**
 * Safely formats Date, Firestore Timestamp, or ISO date string into Indian localized date format.
 * @param {Date|Object|string|number} dateVal - Date value to format.
 * @returns {string} Formatted date string (e.g. 5 Nov 2026).
 */
function formatDashboardDate(dateVal) {
  if (!dateVal) return "N/A";
  const d = dateVal instanceof Date ? dateVal : (dateVal?.toDate ? dateVal.toDate() : new Date(dateVal));
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DEFAULT_DASHBOARD_THUMBNAIL_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-size%3D%2224%22%20x%3D%2250%25%22%20y%3D%2255%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * CustomerDashboard - Unified customer self-service hub.
 *
 * Capabilities:
 * - Customer ID badge with one-click clipboard copy
 * - Lifetime orders, payments, reviews, and total spend summary statistics
 * - Tabbed history explorer for orders, financial ledgers, reviews, and audit trails
 * - Real-time client-side search across order IDs and product titles
 * - Direct navigation to write reviews or review detailed invoices
 *
 * @component
 * @returns {JSX.Element}
 */
export default function CustomerDashboard() {
  useDocumentTitle("Customer Portal - Kavya Luxury Gifts");
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'payments' | 'reviews' | 'activity'
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
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

  /**
   * Re-fetches all customer orders, payments, reviews, and activity logs from database.
   */
  function refreshDashboard() {
    const customerId = userProfile?.customerId;
    const userId = currentUser?.uid;
    if (customerId || userId) {
      setLoading(true);
      loadFullCustomerDashboardHistory(customerId, userId)
        .then((res) => {
          setData(res);
          toast.success("Dashboard data refreshed!");
        })
        .catch((err) => {
          console.error("Error refreshing dashboard:", err);
          toast.error("Could not refresh dashboard.");
        })
        .finally(() => setLoading(false));
    }
  }

  /**
   * Signs current customer out of Firebase Auth and navigates to homepage.
   */
  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const { orders, payments, reviews, activities } = data;
  const totalSpend = orders.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
  const filteredOrders = orders.filter((ord) => {
    if (!orderSearchQuery.trim()) return true;
    const q = orderSearchQuery.trim().toLowerCase();
    const idMatch = String(ord.orderId || "").toLowerCase().includes(q);
    const prodMatch = ord.products?.some((p) => String(p.productName || "").toLowerCase().includes(q));
    return idMatch || prodMatch;
  });


  return (
    <div className="dashboard-container container section">
      {/* Welcome Hero Banner */}
      <div className="dashboard-hero card">
        <div className="dashboard-hero-content">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="customer-badge">
              Customer ID: {userProfile?.customerId || "CUS-10001"}
            </span>
            <button
              type="button"
              onClick={() => {
                const cid = userProfile?.customerId || "CUS-10001";
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(cid);
                }
                toast.success("Customer ID copied to clipboard!");
              }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "2px" }}
              title="Copy Customer ID"
              aria-label="Copy Customer ID"
            >
              📋
            </button>
          </div>
          <h2>Welcome, {userProfile?.fullName || currentUser?.email}</h2>
          <p className="muted">
            Track your bespoke hampers, verified payments, unboxing reviews, and personal activity log in one secure hub.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button
            type="button"
            onClick={refreshDashboard}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh dashboard history"
          >
            ↻ Refresh
          </button>
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
        <div className="dash-card card" onClick={() => { setActiveTab("orders"); window.scrollTo({ top: 300, behavior: "smooth" }); }} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">🎁</div>
          <div className="dash-card-text">
            <h3>{orders.length} {orders.length === 1 ? "Order" : "Orders"}</h3>
            <p className="muted">Total bookings placed</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "orders" ? "●" : "→"}</span>
        </div>

        <div className="dash-card card" onClick={() => { setActiveTab("payments"); window.scrollTo({ top: 300, behavior: "smooth" }); }} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">💳</div>
          <div className="dash-card-text">
            <h3>{payments.length} {payments.length === 1 ? "Payment" : "Payments"}</h3>
            <p className="muted">Verified ledger records</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "payments" ? "●" : "→"}</span>
        </div>

        <div className="dash-card card" onClick={() => { setActiveTab("reviews"); window.scrollTo({ top: 300, behavior: "smooth" }); }} style={{ cursor: "pointer" }}>
          <div className="dash-card-icon">★</div>
          <div className="dash-card-text">
            <h3>{reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}</h3>
            <p className="muted">Hamper unboxing feedback</p>
          </div>
          <span className="dash-card-arrow">{activeTab === "reviews" ? "●" : "→"}</span>
        </div>

        <div className="dash-card card" style={{ background: "linear-gradient(135deg, #fff9f5 0%, #fff 100%)" }}>
          <div className="dash-card-icon">💎</div>
          <div className="dash-card-text">
            <h3>{formatCurrency(totalSpend)}</h3>
            <p className="muted">Total lifetime value</p>
          </div>
          <span className="dash-card-arrow">★</span>
        </div>
      </div>

      {/* HISTORY MANAGEMENT TABS */}
      <div className="history-section card" style={{ padding: "32px" }}>
        <div className="history-tabs-nav" role="tablist" aria-label="Customer History Tabs">
          <button
            type="button"
            role="tab" aria-selected={activeTab === "orders"} className={`history-tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span>🎁</span> Order History
            <span className="tab-count-badge">{orders.length}</span>
          </button>

          <button
            type="button"
            role="tab" aria-selected={activeTab === "payments"} className={`history-tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <span>💳</span> Payment History
            <span className="tab-count-badge">{payments.length}</span>
          </button>

          <button
            type="button"
            role="tab" aria-selected={activeTab === "reviews"} className={`history-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <span>★</span> Review History
            <span className="tab-count-badge">{reviews.length}</span>
          </button>

          <button
            type="button"
            role="tab" aria-selected={activeTab === "activity"} className={`history-tab-btn ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => { setActiveTab("activity"); window.scrollTo({ top: 300, behavior: "smooth" }); }}
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
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
                    <input
                      type="text"
                      placeholder="Search orders by ID or hamper name..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border, #e5e7eb)", fontSize: "13px" }}
                    />
                    {orderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setOrderSearchQuery("")}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)" }}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <span className="muted" style={{ fontSize: "12.5px" }}>
                    Showing {filteredOrders.length} of {orders.length} {orders.length === 1 ? "order" : "orders"}
                  </span>
                </div>
                {filteredOrders.length === 0 ? (
                  <div className="empty-dash-card" style={{ padding: "32px 0" }}>
                    <p className="muted">No orders match "{orderSearchQuery}".</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOrderSearchQuery("")} style={{ marginTop: "10px" }}>
                      Clear Search Filter
                    </button>
                  </div>
                ) : (
                <div className="history-list">
                {filteredOrders.map((ord) => (
                  <div key={ord.orderId} className="history-card">
                    <div className="history-card-header">
                      <div>
                        <span className="history-ref-badge">{ord.orderId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(ord.orderId);
                            }
                            toast.success(`Order ID ${ord.orderId} copied!`);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", marginLeft: "4px", padding: 0 }}
                          title="Copy Order ID"
                        >
                          📋
                        </button>
                        <span className="history-date" style={{ marginLeft: "12px" }}>
                          {formatDashboardDate(ord.date)}
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
                            {p.image && (
                              <img
                                src={toDirectImageUrl(p.image) || DEFAULT_DASHBOARD_THUMBNAIL_SVG}
                                alt={p.productName}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_DASHBOARD_THUMBNAIL_SVG;
                                }}
                              />
                            )}
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
                          {formatCurrency(ord.total || 0)}
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
              </>
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
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <strong>{p.paymentId}</strong>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.clipboard?.writeText) {
                                  navigator.clipboard.writeText(p.paymentId);
                                }
                                toast.success(`Payment ID ${p.paymentId} copied!`);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", padding: 0 }}
                              title="Copy Payment Reference"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td>
                          <Link to={`/order-confirmation/${p.orderId}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                            {p.orderId}
                          </Link>
                        </td>
                        <td><strong>{formatCurrency(p.amount || 0)}</strong></td>
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
                          {formatDashboardDate(p.date)}
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
                          {formatDashboardDate(rev.date)}
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
                    <span className={`activity-badge ${act.action}`} style={{ textTransform: "capitalize", fontWeight: 600 }}>
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
