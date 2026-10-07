import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getOrdersByCustomer } from "../../services/orderService";
import "./CustomerDashboard.css";

export default function CustomerDashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      getOrdersByCustomer(currentUser.uid)
        .then((orders) => setRecentOrders(orders.slice(0, 3)))
        .finally(() => setLoading(false));
    }
  }, [currentUser]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

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
            Manage your bespoke gift orders, gift wrapping preferences, and delivery addresses all in one place.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/" className="btn btn-primary">
            Explore Hampers
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="dashboard-grid">
        <Link to="/orders" className="dash-card card">
          <div className="dash-card-icon">🎁</div>
          <div className="dash-card-text">
            <h3>My Orders</h3>
            <p className="muted">Track gift shipments and download order receipts</p>
          </div>
          <span className="dash-card-arrow">→</span>
        </Link>

        <Link to="/profile" className="dash-card card">
          <div className="dash-card-icon">👤</div>
          <div className="dash-card-text">
            <h3>Profile & Security</h3>
            <p className="muted">Update delivery address and manage your password</p>
          </div>
          <span className="dash-card-arrow">→</span>
        </Link>

        <Link to="/cart" className="dash-card card">
          <div className="dash-card-icon">🛍️</div>
          <div className="dash-card-text">
            <h3>My Gift Cart</h3>
            <p className="muted">View selected hampers and custom gift notes</p>
          </div>
          <span className="dash-card-arrow">→</span>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="dashboard-recent section">
        <div className="recent-header">
          <h3>Recent Orders</h3>
          <Link to="/orders" className="view-all-link">
            View All Orders →
          </Link>
        </div>

        {loading && <p className="muted">Loading recent orders...</p>}

        {!loading && recentOrders.length === 0 && (
          <div className="card empty-dash-card">
            <p className="muted">You haven't placed any gift hamper orders yet.</p>
            <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: "12px" }}>
              Start Shopping
            </Link>
          </div>
        )}

        {!loading && recentOrders.length > 0 && (
          <div className="orders-table-wrapper card">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong>{ord.orderId}</strong>
                    </td>
                    <td>
                      {ord.items?.map((it) => it.product_name).join(", ") || "Gift Hamper"}
                      {ord.giftWrap?.enabled && (
                        <span className="wrap-pill">Wrapped</span>
                      )}
                    </td>
                    <td>₹{ord.total?.toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status-pill ${ord.orderStatus || "placed"}`}>
                        {ord.orderStatus || "placed"}
                      </span>
                    </td>
                    <td>
                      <Link to="/orders" className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
