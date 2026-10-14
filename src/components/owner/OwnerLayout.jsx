import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./OwnerLayout.css";

export default function OwnerLayout({ children, title, subtitle, actionButton }) {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/owner/login");
  }

  const navLinks = [
    { to: "/owner/dashboard", label: "Dashboard", icon: "📊", end: true },
    { to: "/owner/products", label: "Products", icon: "🎁" },
    { to: "/owner/categories", label: "Categories", icon: "🏷️" },
    { to: "/owner/orders", label: "Orders", icon: "📦" },
    { to: "/owner/payments", label: "Payments", icon: "💳" },
    { to: "/owner/users", label: "Customers", icon: "👥" },
    { to: "/owner/reviews", label: "Reviews", icon: "⭐" },
    { to: "/owner/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="owner-admin-wrapper">
      {/* Owner Top Bar */}
      <header className="owner-topbar">
        <div className="owner-topbar-inner container">
          <div className="owner-brand-group">
            <Link to="/owner/dashboard" className="owner-logo">
              <span className="owner-crest">👑</span>
              <span className="owner-brand-text">Kavya Gifting</span>
              <span className="owner-badge">Executive</span>
            </Link>

            <div className="owner-live-indicator" title="Connected to Production Database">
              <span className="pulse-dot"></span>
              <span className="live-text">Live Ops</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="owner-nav" aria-label="Owner Management Navigation">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `owner-nav-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Actions & Profile */}
          <div className="owner-user-actions">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-store-preview"
              title="Open customer storefront in new tab"
            >
              <span>🛍️</span>
              <span className="preview-label">Live Store</span>
              <span className="external-arrow">↗</span>
            </Link>

            <div className="owner-avatar-pill">
              <span className="owner-avatar-circle">
                {(currentUser?.email || "A").charAt(0).toUpperCase()}
              </span>
              <span className="owner-email-tag" title={currentUser?.email}>
                {currentUser?.email?.split("@")[0] || "Admin"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn-owner-logout"
              title="Sign out of administrative portal"
            >
              Logout
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="owner-hamburger"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="owner-mobile-drawer">
            <div className="owner-mobile-drawer-inner container">
              <nav className="owner-mobile-nav">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `owner-mobile-nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="owner-mobile-footer">
                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🛍️ View Live Customer Store ↗
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ width: "100%", justifyContent: "center", color: "#991b1b" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="owner-main container section">
        <div className="owner-page-header">
          <div className="owner-page-title-box">
            <div className="owner-breadcrumbs">
              <Link to="/owner/dashboard">Owner Console</Link>
              <span className="separator">/</span>
              <span className="current">{title}</span>
            </div>
            <h2>{title}</h2>
            {subtitle && <p className="owner-page-subtitle">{subtitle}</p>}
          </div>
          {actionButton && <div className="owner-header-action">{actionButton}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}
