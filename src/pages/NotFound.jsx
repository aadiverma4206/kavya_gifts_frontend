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
      </div>
    </div>
  );
}
