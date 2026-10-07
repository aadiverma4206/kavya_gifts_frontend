import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  checkCanCustomerReview,
  submitProductReview,
  editCustomerReview,
} from "../../controllers/reviewController.js";
import { getProductById } from "../../services/productService.js";
import { toDirectImageUrl } from "../../utils/driveImage.js";
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

  const [isEditing, setIsEditing] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [ineligibilityReason, setIneligibilityReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setCheckingEligibility(true);
      setError("");

      try {
        // 1. Fetch Product details
        if (productId) {
          const prod = await getProductById(productId);
          if (isMounted && prod) {
            setProduct(prod);
            if (!productName) setProductName(prod.product_name || prod.productName);
          }
        }

        // 2. Check purchase eligibility and existing review
        const customerId = userProfile?.customerId || currentUser?.uid;
        if (customerId && productId) {
          const check = await checkCanCustomerReview(customerId, productId);
          if (isMounted) {
            setCanReview(check.canReview);
            if (!check.canReview) {
              setIneligibilityReason(check.reason);
            } else if (check.alreadyReviewed && check.existingReview) {
              // Populate for editing own review
              setIsEditing(true);
              setExistingReviewId(check.existingReview.reviewId);
              setRating(check.existingReview.rating || 5);
              setTitle(check.existingReview.title || "");
              setComment(check.existingReview.comment || "");
            }
          }
        } else {
          if (isMounted) {
            setCanReview(false);
            setIneligibilityReason("Please sign in to write a review.");
          }
        }
      } catch (err) {
        console.error("Review check error:", err);
      } finally {
        if (isMounted) setCheckingEligibility(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [productId, userProfile, currentUser, productName]);

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
      const customerId = userProfile?.customerId || currentUser?.uid;

      if (isEditing && existingReviewId) {
        // Edit existing review (status cannot be modified)
        await editCustomerReview({
          reviewId: existingReviewId,
          customerId,
          rating,
          title: title.trim(),
          comment: comment.trim(),
        });
        setSuccessMsg("Your review has been updated successfully! ✨");
      } else {
        // Create new review
        const review = await submitProductReview({
          productId,
          productName: productName || product?.product_name || product?.productName || "Gift Hamper",
          customerId,
          customerName: userProfile?.fullName || "Valued Customer",
          rating,
          title: title.trim(),
          comment: comment.trim(),
        });
        setSuccessMsg(`Thank you! Your review (${review.reviewId}) has been submitted.`);
      }

      setTimeout(() => {
        navigate(`/product/${productId}`);
      }, 1500);
    } catch (err) {
      console.error("Review submission error:", err);
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingEligibility) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: "80px 0" }}>
        <p className="muted">Verifying purchase eligibility...</p>
      </div>
    );
  }

  // Not eligible: has not purchased this product
  if (!canReview) {
    return (
      <div className="review-container container section">
        <div className="review-card card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>🔒</span>
          <h2>Verified Purchase Required</h2>
          <p className="muted" style={{ maxWidth: "520px", margin: "12px auto 24px" }}>
            {ineligibilityReason || "A customer can review a product only after purchasing that product."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to={`/product/${productId}`} className="btn btn-primary">
              View Hamper Details
            </Link>
            <Link to="/orders" className="btn btn-secondary">
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-container container section">
      <div className="review-card card">
        <div className="review-header">
          <span className="auth-tag">
            {isEditing ? "Edit Your Review" : "Verified Customer Unboxing Experience"}
          </span>
          <h2>{isEditing ? "Update Your Review" : "Review Hamper"}</h2>
          <p className="muted">
            Share your thoughts on <strong>{productName || "this hamper"}</strong> to help others choose the perfect gift.
          </p>
        </div>

        {product && (
          <div className="review-product-preview">
            <img src={toDirectImageUrl(product.image || product.thumbnail || product.image_url)} alt={product.product_name} />
            <div>
              <h4>{product.product_name || product.productName}</h4>
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
            <label>Your Review & Feedback *</label>
            <textarea
              rows="4"
              placeholder="What made this hamper special? How was the packaging, presentation, and delivery?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <div className="form-actions-row">
            <Link to={`/product/${productId}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Submitting..." : isEditing ? "Save Review Updates" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
