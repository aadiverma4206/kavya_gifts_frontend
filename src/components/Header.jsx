import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, User, Crown, LogOut, Package, Menu, X, Sparkles, Heart } from "lucide-react";
import { getActiveCategories } from "../services/categoryService.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Header.css";

export default function Header() {
  const [categories, setCategories] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();
  const { currentUser, userProfile, isOwner, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll detection for dynamic shadow/blur
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change or Escape key
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          navigate("/#catalog");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, navigate]);

  useEffect(() => {
    let isMounted = true;
    getActiveCategories()
      .then((unique) => {
        if (!isMounted) return;
        const catNames = unique
          .map((c) => (typeof c === "object" ? c.categoryName || c.name || "" : c))
          .filter(Boolean);
        setCategories(catNames.length > 0 ? catNames : ["Diwali", "Wedding", "Corporate", "Birthday"]);
      })
      .catch(() => {
        if (isMounted) setCategories(["Diwali", "Wedding", "Corporate", "Birthday"]);
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

  const isCurrentCategory = (cat) =>
    decodeURIComponent(location.pathname) === `/category/${cat}`;

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-inner">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Brand Logo */}
        <Link to="/" className="logo-brand">
          <div className="logo-icon-wrap">
            <Sparkles size={16} className="logo-icon" />
          </div>
          <div className="logo-text-group">
            <span className="logo-title">KAVYA</span>
            <span className="logo-subtitle">LUXURY GIFTING</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav" aria-label="Main Navigation">
          <Link
            to="/#catalog"
            className={`nav-link ${location.pathname === "/" && location.hash === "#catalog" ? "active" : ""}`}
          >
            All Hampers
          </Link>
          {categories.slice(0, 5).map((category) => (
            <Link
              key={category}
              to={`/category/${encodeURIComponent(category)}`}
              className={`nav-link ${isCurrentCategory(category) ? "active" : ""}`}
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* Actions & Profile */}
        <div className="header-actions">
          <button
            type="button"
            className="header-sublink hide-mobile"
            style={{ border: "1px solid rgba(122, 31, 43, 0.15)", borderRadius: "999px", width: "auto", padding: "0 10px", gap: "6px", fontSize: "12px", height: "32px" }}
            onClick={() => {
              const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
              if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
              } else {
                navigate("/#catalog");
              }
            }}
            title="Search hampers (Ctrl + K)"
          >
            <span>🔍</span>
            <span className="muted" style={{ fontSize: "11px", fontWeight: 600 }}>Ctrl+K</span>
          </button>

          {currentUser ? (
            <div className="header-auth-group">
              {isOwner ? (
                <div className="user-dropdown-wrap">
                  <Link to="/owner/dashboard" className="owner-badge-btn">
                    <Crown size={14} /> Owner Portal
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="header-sublink logout-btn hide-mobile"
                    title="Logout"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <div className="user-dropdown-wrap">
                  <Link to="/dashboard" className="header-user-btn">
                    <div className="user-avatar-circle">
                      {userProfile?.fullName?.[0]?.toUpperCase() || <User size={13} />}
                    </div>
                    <span className="user-name">
                      {userProfile?.fullName?.split(" ")[0] || "Account"}
                    </span>
                  </Link>
                  <Link to="/orders" className="header-sublink hide-mobile" title="Order History">
                    <Package size={15} />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="header-sublink logout-btn hide-mobile"
                    title="Logout"
                  >
                    <LogOut size={14} />
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
                Join
              </Link>
            </div>
          )}

          {/* Cart Icon Button */}
          <Link
            to="/cart"
            className="icon-btn cart-icon-btn"
            aria-label={`Cart with ${totalItems} items`}
          >
            <ShoppingBag size={20} />
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <span className="drawer-title">Navigation</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-nav-links">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link to="/#catalog" onClick={() => setMobileMenuOpen(false)}>
                Browse All Hampers
              </Link>
              <div className="mobile-section-label">CATEGORIES</div>
              {categories.map((category) => (
                <Link
                  key={category}
                  to={`/category/${encodeURIComponent(category)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="category-sublink"
                >
                  <span>{category} Collection</span>
                </Link>
              ))}

              <hr className="mobile-nav-divider" />
              {currentUser ? (
                <>
                  {isOwner ? (
                    <Link
                      to="/owner/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-owner-link"
                    >
                      <Crown size={16} /> Owner Admin Portal
                    </Link>
                  ) : (
                    <>
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <User size={16} /> My Account
                      </Link>
                      <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                        <Package size={16} /> Order History
                      </Link>
                    </>
                  )}
                  <button type="button" onClick={handleLogout} className="mobile-logout-btn">
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              ) : (
                <div className="mobile-auth-actions">
                  <Link to="/login" className="btn btn-secondary btn-full" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-full" onClick={() => setMobileMenuOpen(false)}>
                    Create Account
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
