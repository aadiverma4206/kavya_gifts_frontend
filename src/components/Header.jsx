import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllProducts } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import "./Header.css";

export default function Header() {
  const [categories, setCategories] = useState([]);
  const { totalItems } = useCart();

  useEffect(() => {
    getAllProducts()
      .then((products) => {
        const unique = [...new Set(products.map((p) => p.category))].filter(Boolean);
        setCategories(unique);
      })
      .catch(() => setCategories([]));
  }, []);

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
          <button className="icon-btn" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link to="/cart" className="icon-btn cart-icon" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-13z" />
              <path d="M6 6L4 3H2" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
            </svg>
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
