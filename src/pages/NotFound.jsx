import { Link } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import "./NotFound.css";

export default function NotFound() {
  useDocumentTitle("Page Not Found");
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <span className="not-found-badge">404 Error</span>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-subtitle">
          Oops! The page or treasure you are looking for does not exist or has been moved to another shelf.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary btn-pill">
            Back to Home
          </Link>
          <Link to="/cart" className="btn btn-secondary btn-pill">
            View Cart
          </Link>
        </div>
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f0e6e4" }}>
          <p className="muted" style={{ fontSize: "13px", marginBottom: "10px" }}>Popular Collections to Explore:</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/category/Festive%20Celebrations" className="btn btn-secondary btn-sm" style={{ fontSize: "12px", borderRadius: "999px" }}>
              🎉 Festive Hampers
            </Link>
            <Link to="/category/Weddings%20%26%20Anniversaries" className="btn btn-secondary btn-sm" style={{ fontSize: "12px", borderRadius: "999px" }}>
              💍 Wedding Trunks
            </Link>
            <Link to="/category/Artisanal%20Chocolates%20%26%20Sweets" className="btn btn-secondary btn-sm" style={{ fontSize: "12px", borderRadius: "999px" }}>
              🍫 Luxury Chocolates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
