import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Crown, LogOut, Package } from "lucide-react";
import { getActiveCategories } from "../services/categoryService.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Header.css";

export default function Header() {
  const [categories, setCategories] = useState([]);
  const { totalItems } = useCart();
  const { currentUser, userProfile, isOwner, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    getActiveCategories()
      .then((unique) => {
        if (isMounted) setCategories(unique);
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          Kavya Gifting
        </Link>

        <nav className="nav">
          {categories.map((category) => (
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
                  <Link to="/orders" className="header-sublink">
                    <Package size={14} style={{ marginRight: "3px" }} /> Orders
                  </Link>
                  <button onClick={handleLogout} className="header-sublink logout-btn">
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
              <Link to="/register" className="header-register-btn">
                Register
              </Link>
            </div>
          )}

          {/* Cart Icon */}
          <Link to="/cart" className="icon-btn cart-icon" aria-label="Cart">
            <ShoppingBag size={21} />
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
