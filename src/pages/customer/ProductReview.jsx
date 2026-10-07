import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createReview } from "../../services/reviewService";
import { getProductById } from "../../services/productService";
import { toDirectImageUrl } from "../../utils/driveImage";
import "./ProductReview.css";

export default function ProductReview() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, isBlocked } = useAuth();

  const [product, setProduct] = useState(null);
  const [productName, setProductName] = useState(location.state?.productName || "");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (productId) {
      getProductById(productId).then((prod) => {
        if (prod) {
          setProduct(prod);
          if (!productName) setProductName(prod.product_name || prod.productName);
        }
      });
    }
  }, [productId, productName]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !comment.trim()) {
      setError("Please provide both a headline and your review feedback.");
      return;
    }

    if (isBlocked) {
      setError("Your account is blocked from posting reviews.");
      return;
    }

    setLoading(true);
    try {
      const review = await createReview({
        productId,
        productName: productName || product?.product_name || product?.productName || "Gift Hamper",
        customerId: userProfile?.customerId,
        customerName: userProfile?.fullName || "Valued Customer",
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });

      setSuccessMsg(`Thank you! Your review (${review.reviewId}) has been submitted.`);
      setTimeout(() => {
        navigate(`/product/${productId}`);
      }, 1800);
    } catch (err) {
      console.error("Review submission error:", err);
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="review-container container section">
      <div className="review-card card">
        <div className="review-header">
          <span className="auth-tag">Customer Experience</span>
          <h2>Review Hamper</h2>
          <p className="muted">
            Share your thoughts on <strong>{productName || "this hamper"}</strong> to help others choose the perfect gift.
          </p>
        </div>

        {product && (
          <div className="review-product-preview">
            <img src={toDirectImageUrl(product.image_url)} alt={product.product_name} />
            <div>
              <h4>{product.product_name}</h4>
              <p className="muted">₹{Number(product.price).toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}

        {error && <div className="auth-alert error">{error}</div>}
        {successMsg && <div className="auth-alert success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label>Overall Rating</label>
            <div className="star-rating-selector">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-btn ${star <= rating ? "selected" : ""}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
              <span className="star-rating-text muted">
                {rating === 5
                  ? "5 / 5 (Exceptional)"
                  : rating === 4
                  ? "4 / 5 (Very Good)"
                  : rating === 3
                  ? "3 / 5 (Average)"
                  : rating === 2
                  ? "2 / 5 (Below Average)"
                  : "1 / 5 (Poor)"}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Review Headline / Title *</label>
            <input
              type="text"
              placeholder="e.g. Stunning Diwali presentation and fresh sweets!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Your Review & Experience *</label>
            <textarea
              rows="4"
              placeholder="What made this hamper special? How was the packaging, presentation, and delivery?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <div className="form-actions-row">
            <Link to="/orders" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
