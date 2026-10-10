import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, User, Crown, LogOut, Package, Menu, X } from "lucide-react";
import { getActiveCategories } from "../services/categoryService.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Header.css";

export default function Header() {
  const [categories, setCategories] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { currentUser, userProfile, isOwner, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;
    getActiveCategories()
      .then((unique) => {
        if (!isMounted) return;
        const catNames = unique.map((c) => (typeof c === "object" ? (c.categoryName || c.name || "") : c)).filter(Boolean);
        setCategories(catNames.length > 0 ? catNames : ["Diwali", "Wedding", "Corporate"]);
      })
      .catch(() => {
        if (isMounted) setCategories(["Diwali", "Wedding", "Corporate"]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" className="logo">
          Kavya Gifting
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav" aria-label="Main Navigation">
          <Link to="/#catalog" style={{ fontWeight: 600 }}>
            All Hampers
          </Link>
          {categories.slice(0, 6).map((category) => (
            <Link key={category} to={`/category/${encodeURIComponent(category)}`}>
              {category}
            </Link>
          ))}
        </nav>

        <div className="header-icons">
          {/* User Account / Navigation */}
          {currentUser ? (
            <div className="header-auth-group">
              {isOwner ? (
                <Link to="/owner/dashboard" className="owner-badge-btn">
                  <Crown size={14} style={{ marginRight: "4px" }} /> Owner Portal
                </Link>
              ) : (
                <div className="user-dropdown-wrap">
                  <Link to="/dashboard" className="header-user-btn">
                    <User size={14} style={{ marginRight: "4px" }} />
                    {userProfile?.fullName?.split(" ")[0] || "Account"}
                  </Link>
                  <Link to="/orders" className="header-sublink hide-mobile">
                    <Package size={14} style={{ marginRight: "3px" }} /> Orders
                  </Link>
                  <button onClick={handleLogout} className="header-sublink logout-btn hide-mobile">
                    <LogOut size={13} style={{ marginRight: "3px" }} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="header-auth-group">
              <Link to="/login" className="header-login-btn">
                Sign In
              </Link>
              <Link to="/register" className="header-register-btn hide-mobile">
                Register
              </Link>
            </div>
          )}

          {/* Cart Icon */}
          <Link to="/cart" className="icon-btn cart-icon" aria-label={`Cart with ${totalItems} items`}>
            <ShoppingBag size={21} />
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-nav-links">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                to={`/category/${encodeURIComponent(category)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {category} Hampers
              </Link>
            ))}
            {currentUser ? (
              <>
                <hr className="mobile-nav-divider" />
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  My Account
                </Link>
                <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                  Order History
                </Link>
                <button onClick={handleLogout} className="mobile-logout-btn">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <hr className="mobile-nav-divider" />
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
