import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./OwnerLayout.css";

export default function OwnerLayout({ children, title, subtitle, actionButton }) {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/owner/login");
  }

  return (
    <div className="owner-admin-wrapper">
      {/* Owner Top Bar */}
      <div className="owner-topbar">
        <div className="owner-topbar-inner container">
          <div className="owner-brand">
            <Link to="/owner/dashboard" className="owner-logo">
              Kavya Gifting <span>Owner Portal</span>
            </Link>
          </div>

          <nav className="owner-nav">
            <NavLink to="/owner/dashboard" end className={({ isActive }) => (isActive ? "active" : "")}>
              Dashboard
            </NavLink>
            <NavLink to="/owner/products" className={({ isActive }) => (isActive ? "active" : "")}>
              Products
            </NavLink>
            <NavLink to="/owner/categories" className={({ isActive }) => (isActive ? "active" : "")}>
              Categories
            </NavLink>
            <NavLink to="/owner/orders" className={({ isActive }) => (isActive ? "active" : "")}>
              Orders
            </NavLink>
            <NavLink to="/owner/payments" className={({ isActive }) => (isActive ? "active" : "")}>
              Payments
            </NavLink>
            <NavLink to="/owner/users" className={({ isActive }) => (isActive ? "active" : "")}>
              Customers
            </NavLink>
            <NavLink to="/owner/reviews" className={({ isActive }) => (isActive ? "active" : "")}>
              Reviews
            </NavLink>
          </nav>

          <div className="owner-user-actions">
            <span className="owner-email-tag muted">{currentUser?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="owner-main container section">
        <div className="owner-page-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {actionButton && <div>{actionButton}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}
