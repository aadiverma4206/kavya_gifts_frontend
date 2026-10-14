import { Link } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import "./NotFound.css";

export default function NotFound() {
  useDocumentTitle("Page Not Found | Kavya Gifting");

  const popularOccasions = [
    { name: "Festive Hampers", path: "/category/Festive%20Celebrations", icon: "✨" },
    { name: "Wedding Trunks", path: "/category/Weddings%20%26%20Anniversaries", icon: "💍" },
    { name: "Artisanal Chocolates", path: "/category/Artisanal%20Chocolates%20%26%20Sweets", icon: "🍫" },
    { name: "Corporate Suites", path: "/category/Corporate%20Gifting", icon: "💼" },
    { name: "Gourmet Delights", path: "/category/Gourmet%20%26%20Dry%20Fruits", icon: "🌰" },
  ];

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-floating-gift">🎁</div>
        <span className="not-found-badge">404 • Missing Hamper</span>
        <h1 className="not-found-title">Treasured Page Not Found</h1>
        <p className="not-found-subtitle">
          The artisanal hamper or bespoke gift page you are looking for may have been retired,
          renamed, or moved to another curated collection.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary btn-pill">
            Explore 100+ Hampers
          </Link>
          <Link to="/cart" className="btn btn-secondary btn-pill">
            View Shopping Cart
          </Link>
        </div>

        <div className="not-found-collections-nav">
          <p className="muted" style={{ fontSize: "13px", margin: 0, fontWeight: 600 }}>
            Curated Occasions to Discover:
          </p>
          <div className="collection-pills-row">
            {popularOccasions.map((occ) => (
              <Link
                key={occ.name}
                to={occ.path}
                className="collection-pill-link"
              >
                <span>{occ.icon}</span> {occ.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
