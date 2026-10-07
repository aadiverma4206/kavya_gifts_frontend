import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { getProductById } from "../services/productService.js";
import { getProductReviews } from "../services/reviewService.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import GiftWrapSelector from "../components/customer/GiftWrapSelector.jsx";
import "./Product.css";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, giftWrap, updateGiftWrap } = useCart();
  const { currentUser } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  // Local gift wrap selection state
  const [localWrap, setLocalWrap] = useState(giftWrap);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([getProductById(id), getProductReviews(id)])
      .then(([data, revs]) => {
        if (!isMounted) return;
        if (!data) {
          setError("This product could not be found.");
        } else {
          setProduct(data);
          setReviews(revs || []);
        }
      })
      .catch((err) => {
        console.error("Error loading product:", err);
        if (isMounted) setError("This product could not be found.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <p className="container muted" style={{ padding: "60px 0" }}>Loading hamper details...</p>;
  if (error) return <p className="container muted" style={{ padding: "60px 0" }}>{error}</p>;
  if (!product) return null;

  function handleAddToCart() {
    updateGiftWrap(localWrap);
    addToCart(product, quantity, localWrap);
    setAdded(true);
    toast.success(`${product.product_name} added to your cart! 🎁`);
  }

  function handleBookNow() {
    updateGiftWrap(localWrap);
    addToCart(product, quantity, localWrap);
    navigate("/checkout");
  }

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="product-page-wrapper">
      <section className="section container product-detail">
        <div className="product-detail-image">
          <img src={toDirectImageUrl(product.image_url)} alt={product.product_name} />
          {product.stock_qty <= 5 && product.stock_qty > 0 && (
            <span className="stock-warning-badge">Only {product.stock_qty} left in stock!</span>
          )}
        </div>

        <div className="product-detail-info">
          <div className="product-header-meta">
            <span className="product-category-tag">{product.category}</span>
            {averageRating && (
              <span className="product-rating-badge">★ {averageRating} ({reviews.length} reviews)</span>
            )}
          </div>

          <h1>{product.product_name}</h1>
          <p className="product-detail-price">₹{Number(product.price).toLocaleString("en-IN")}</p>
          <p className="muted product-detail-desc">{product.description}</p>

          {/* Quantity Selector */}
          <div className="quantity-wrapper">
            <label className="qty-label">Quantity:</label>
            <div className="quantity-selector">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
          </div>

          {/* Integrated Gift Wrap Customizer */}
          <GiftWrapSelector value={localWrap} onChange={setLocalWrap} />

          {/* Action Buttons */}
          <div className="product-detail-actions">
            <button className="btn btn-primary" onClick={handleAddToCart}>
              {added ? "✓ Added to Cart" : "Add to Cart"}
            </button>
            <button className="btn btn-secondary" onClick={handleBookNow}>
              Book & Checkout Now →
            </button>
            {added && (
              <button className="btn btn-secondary" onClick={() => navigate("/cart")}>
                View Cart ({quantity})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="section container reviews-section">
        <div className="reviews-section-header">
          <div>
            <h3>Customer Reviews & Ratings</h3>
            <p className="muted">
              {reviews.length > 0
                ? `${reviews.length} customers shared their unboxing experiences for this hamper`
                : "No customer reviews yet. Be the first to review!"}
            </p>
          </div>
          {currentUser && (
            <Link
              to={`/review/${product.product_id}`}
              state={{ productName: product.product_name }}
              className="btn btn-secondary btn-sm"
            >
              ★ Write a Review
            </Link>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="reviews-grid">
            {reviews.map((rev) => (
              <div key={rev.id || rev.reviewId} className="card review-card-item">
                <div className="review-card-top">
                  <div>
                    <strong>{rev.customerName}</strong>
                    <span className="review-stars">{"★".repeat(rev.rating)}</span>
                  </div>
                  <span className="review-date muted">
                    {rev.createdAt?.toDate
                      ? rev.createdAt.toDate().toLocaleDateString("en-IN")
                      : "Verified Purchase"}
                  </span>
                </div>
                <p className="review-text">"{rev.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
