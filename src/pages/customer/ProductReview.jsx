import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  checkCanCustomerReview,
  submitProductReview,
  editCustomerReview,
} from "../../controllers/reviewController.js";
import { getProductById } from "../../services/productService.js";
import { toDirectImageUrl } from "../../utils/driveImage.js";
import useDocumentTitle from "../../hooks/useDocumentTitle.js";
import { formatCurrency } from "../../utils/formatters.js";
import "./ProductReview.css";

const REVIEW_QUICK_TAGS = [
  "✨ Royal Packaging",
  "🎀 Satin Ribbon Finish",
  "🍬 Fresh Confections",
  "⚡ Fast Delivery",
  "💌 Wax Sealed Note",
];

const DEFAULT_REVIEW_PRODUCT_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2220%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Returns localized descriptive label for a given 1-5 star review rating score.
 * @param {number} rating - Score between 1 and 5.
 * @returns {string} Formatted score and descriptive label.
 */
function getRatingDescription(rating) {
  switch (rating) {
    case 5: return "5 / 5 (Exceptional)";
    case 4: return "4 / 5 (Very Good)";
    case 3: return "3 / 5 (Average)";
    case 2: return "2 / 5 (Below Average)";
    case 1: return "1 / 5 (Poor)";
    default: return `${rating} / 5`;
  }
}

/**
 * ProductReview - Verified customer hamper review and unboxing ratings dashboard.
 *
 * Key capabilities:
 * - Verified purchaser eligibility gating (only purchasers can review)
 * - Interactive star rating selector with live hover feedback
 * - Review creation and seamless editing of own previously submitted review
 * - Quick feedback chip tags for swift review drafting
 * - Accessible keyboard navigation and ARIA alerts
 *
 * @component
 * @returns {JSX.Element}
 */
export default function ProductReview() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, isBlocked } = useAuth();
  const navTimerRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [productName, setProductName] = useState(location.state?.productName || "");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  useDocumentTitle(isEditing ? "Edit Review - Kavya Luxury Gifts" : "Review Hamper - Kavya Luxury Gifts");
  const [existingReviewId, setExistingReviewId] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [ineligibilityReason, setIneligibilityReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    /**
     * Asynchronously verifies order purchase eligibility and retrieves previous customer review.
     */
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
        const customerId = String(userProfile?.customerId || currentUser?.uid || "");
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
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, [productId, userProfile, currentUser, productName]);

  /**
   * Validates headline and feedback rating before persisting review to Firestore.
   * @param {React.FormEvent<HTMLFormElement>} e - Submit form event.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !comment.trim()) {
      setError("Please provide both a headline and detailed review feedback (minimum 10 characters).");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Please write at least 10 characters describing your unboxing experience.");
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
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Create new review
        const review = await submitProductReview({
          productId,
          productName: productName || product?.product_name || product?.productName || "Gift Hamper",
          customerId,
          customerName: userProfile?.fullName || currentUser?.displayName || "Valued Customer",
          rating,
          title: title.trim(),
          comment: comment.trim(),
        });
        setSuccessMsg(`Thank you! Your review (${review.reviewId}) has been submitted.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      navTimerRef.current = setTimeout(() => {
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
            {isEditing ? "Edit Your Review" : "✓ Verified Customer Unboxing Experience"}
          </span>
          <h2>{isEditing ? "Update Your Review" : "Review Hamper"}</h2>
          <p className="muted">
            Share your thoughts on <strong>{productName || "this hamper"}</strong> to help others choose the perfect gift.
          </p>
        </div>

        {product && (
          <div className="review-product-preview">
            <img
              src={toDirectImageUrl(product.image || product.thumbnail || product.image_url) || DEFAULT_REVIEW_PRODUCT_SVG}
              alt={product.product_name || "Gift Hamper"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_REVIEW_PRODUCT_SVG;
              }}
            />
            <div>
              <h4>{product.product_name || product.productName}</h4>
              <p className="muted">{formatCurrency(product.price || 0)}</p>
            </div>
          </div>
        )}

        {error && <div className="auth-alert error" role="alert" aria-live="assertive">{error}</div>}
        {successMsg && <div className="auth-alert success" role="alert" aria-live="polite">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label>Overall Rating</label>
            <div
              className="star-rating-selector"
              tabIndex={0}
              role="radiogroup"
              aria-label="Star Rating Selector"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  setRating((prev) => Math.min(5, prev + 1));
                } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  setRating((prev) => Math.max(1, prev - 1));
                }
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-btn ${star <= (hoverRating || rating) ? "selected" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  ★
                </button>
              ))}
              <span className="star-rating-text muted">
                {getRatingDescription(hoverRating || rating)}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Review Headline / Title *</label>
            <input
              type="text"
              placeholder="e.g. Stunning Diwali presentation and fresh sweets!"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <div style={{ textAlign: "right", fontSize: "11.5px", color: "var(--color-muted, #777)", marginTop: "2px" }}>
              {(title || "").length} / 100 characters
            </div>
          </div>

          <div className="form-group">
            <label>Your Review & Feedback *</label>
            <textarea
              rows="4"
              placeholder="What made this hamper special? How was the packaging, presentation, and delivery?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              required
            />
            <div style={{ textAlign: "right", fontSize: "11.5px", color: "var(--color-muted, #777)", marginTop: "2px" }}>
              {(comment || "").length} / 1000 characters
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-muted, #777)", display: "block", marginBottom: "6px" }}>
              Quick feedback tags (click to add):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {REVIEW_QUICK_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    setComment((prev) => (prev ? `${prev} ${tag}` : tag).trim());
                  }}
                  style={{ background: "#fdfaf6", border: "1px solid #ebd9c8", borderRadius: "16px", padding: "4px 10px", fontSize: "11.5px", cursor: "pointer", color: "var(--color-primary, #7a1f2b)" }}
                  title={`Add ${tag} to feedback`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions-row">
            <Link to={`/product/${productId}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading} aria-busy={loading}>
              {loading ? "Submitting..." : isEditing ? "Save Review Updates" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
