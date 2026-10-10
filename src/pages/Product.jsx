import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchProductDetails, checkStockStatus, validateProductForCart } from "../controllers/productController.js";
import { getProductReviews } from "../services/reviewService.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./Product.css";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { currentUser } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [giftWrappingSelected, setGiftWrappingSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchProductDetails(id), getProductReviews(id)])
      .then(([data, revs]) => {
        if (!isMounted) return;
        setProduct(data);
        setReviews(revs || []);
        // Reset state
        setQuantity(1);
        setGiftWrappingSelected(false);
        const firstImg =
          (Array.isArray(data?.images) && data.images[0]) ||
          data?.thumbnail ||
          data?.image ||
          data?.image_url ||
          "";
        setActiveImage(firstImg);
      })
      .catch((err) => {
        console.error("Error loading product:", err);
        if (isMounted) setError(err.message || "This product could not be found.");
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

  const stockInfo = checkStockStatus(product);
  const availableStock = stockInfo.availableStock;
  const isOutOfStock = !stockInfo.inStock;

  function handleAddToCart() {
    try {
      const validation = validateProductForCart(product, quantity, giftWrappingSelected);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      addToCart(product, quantity, giftWrappingSelected);
      setAdded(true);
      const wrapText = giftWrappingSelected ? " (with Gift Wrapping)" : "";
      toast.success(`${product.productName || product.product_name} added to your cart${wrapText}! 🎁`);
    } catch (err) {
      toast.error(err.message || "Could not add product to cart.");
    }
  }

  function handleBookNow() {
    try {
      const validation = validateProductForCart(product, quantity, giftWrappingSelected);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      addToCart(product, quantity, giftWrappingSelected);
      if (!currentUser) {
        navigate("/login", { state: { from: { pathname: "/checkout" } } });
      } else {
        navigate("/checkout");
      }
    } catch (err) {
      toast.error(err.message || "Could not proceed to checkout.");
    }
  }

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const unitPrice = Number(product.price) || 0;
  const unitWrapPrice = giftWrappingSelected && product.giftWrappingAvailable
    ? (Number(product.giftWrappingPrice) || 0)
    : 0;
  const itemSubtotal = unitPrice * quantity;
  const wrapTotal = unitWrapPrice * quantity;
  const estimatedTotal = itemSubtotal + wrapTotal;

  const allImages = [
    activeImage,
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
    product.thumbnail,
    product.image_url,
  ].filter(Boolean);
  const uniqueImages = [...new Set(allImages)];
  const currentImgUrl = toDirectImageUrl(activeImage || uniqueImages[0]) || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Luxury%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

  return (
    <div className="product-page-wrapper">
      <section className="section container product-detail">
        <div className="product-detail-image">
          <img
            src={currentImgUrl}
            alt={product.productName || product.product_name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Luxury%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";
            }}
          />
          {stockInfo.isLowStock && (
            <span className="stock-warning-badge">{stockInfo.message}</span>
          )}
          {isOutOfStock && (
            <span
              className="stock-warning-badge"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              Out of Stock
            </span>
          )}

          {uniqueImages.length > 1 && (
            <div className="product-thumbnails-strip" style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto" }}>
              {uniqueImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  style={{
                    border: (activeImage === img || (!activeImage && idx === 0)) ? "2px solid var(--color-primary)" : "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "2px",
                    background: "none",
                    cursor: "pointer",
                    width: "56px",
                    height: "56px",
                    flexShrink: 0,
                  }}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img
                    src={toDirectImageUrl(img)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <div className="product-header-meta">
            <span className="product-category-tag">{product.categoryName || product.category}</span>
            {averageRating && (
              <span className="product-rating-badge">★ {averageRating} ({reviews.length} reviews)</span>
            )}
          </div>

          <h1>{product.productName || product.product_name}</h1>
          <p className="product-detail-price">₹{unitPrice.toLocaleString("en-IN")}</p>
          <p className="muted product-detail-desc">{product.description}</p>

          {/* Stock Availability Indicator */}
          <div style={{ marginBottom: "16px", fontSize: "14px" }}>
            <span style={{ fontWeight: 600 }}>Availability: </span>
            <span style={{ color: isOutOfStock ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
              {isOutOfStock ? "Out of Stock" : `In Stock (${availableStock} units available)`}
            </span>
          </div>

          {/* Quantity Selector */}
          <div className="quantity-wrapper">
            <label className="qty-label">Quantity:</label>
            <div className="quantity-selector">
              <button
                type="button"
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span style={{ minWidth: "24px", textAlign: "center" }}>{quantity}</span>
              <button
                type="button"
                disabled={quantity >= availableStock || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {quantity >= availableStock && availableStock > 0 && (
              <span className="muted" style={{ fontSize: "12px", color: "#b45309" }}>
                Max available stock limit reached
              </span>
            )}
          </div>

          {/* GIFT WRAPPING SECTION */}
          {product.giftWrappingAvailable ? (
            <div
              className="product-giftwrap-box card"
              style={{
                margin: "20px 0",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(183, 110, 121, 0.25)",
                background: "rgba(255, 255, 255, 0.7)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <strong style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎁</span> Gift Wrapping Selection
                </strong>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(183, 110, 121, 0.12)",
                    color: "var(--color-primary, #b76e79)",
                  }}
                >
                  +₹{Number(product.giftWrappingPrice || 120).toLocaleString("en-IN")} / hamper
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: !giftWrappingSelected
                      ? "2px solid var(--color-primary, #b76e79)"
                      : "1px solid #e5e7eb",
                    background: !giftWrappingSelected ? "rgba(183,110,121,0.05)" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="giftWrapSelect"
                    checked={!giftWrappingSelected}
                    onChange={() => setGiftWrappingSelected(false)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>No Gift Wrapping</div>
                    <div className="muted" style={{ fontSize: "12px" }}>Standard secure courier packaging (₹0)</div>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: giftWrappingSelected
                      ? "2px solid var(--color-primary, #b76e79)"
                      : "1px solid #e5e7eb",
                    background: giftWrappingSelected ? "rgba(183,110,121,0.06)" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="giftWrapSelect"
                    checked={giftWrappingSelected}
                    onChange={() => setGiftWrappingSelected(true)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-primary, #b76e79)" }}>
                      Artisan Gift Wrapping
                    </div>
                    <div className="muted" style={{ fontSize: "12px" }}>
                      Luxury box, satin ribbon & handwritten note (+₹{product.giftWrappingPrice || 120})
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div
              style={{
                margin: "16px 0",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>ℹ️</span>
              <span>
                <strong>Gift wrapping not applicable:</strong> This heirloom keepsake comes in its own permanent luxury handcrafted box.
              </span>
            </div>
          )}

          {/* Pricing Calculation Preview */}
          <div
            style={{
              margin: "16px 0 24px",
              padding: "14px",
              borderRadius: "8px",
              background: "#faf7f5",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span className="muted">Hamper Subtotal ({quantity} × ₹{unitPrice.toLocaleString("en-IN")}):</span>
              <span>₹{itemSubtotal.toLocaleString("en-IN")}</span>
            </div>
            {giftWrappingSelected && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "var(--color-primary, #b76e79)",
                  marginBottom: "4px",
                }}
              >
                <span>Gift Wrapping ({quantity} × ₹{unitWrapPrice}):</span>
                <span>+₹{wrapTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "8px",
                marginTop: "6px",
                borderTop: "1px solid #e5e7eb",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              <span>Estimated Total:</span>
              <span style={{ color: "var(--color-primary, #b76e79)" }}>₹{estimatedTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="product-detail-actions">
            <button
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              {added ? "✓ Added to Cart" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleBookNow}
              disabled={isOutOfStock}
            >
              Book & Checkout Now →
            </button>
            {added && (
              <button className="btn btn-secondary" onClick={() => navigate("/cart")}>
                View Cart ({quantity}) →
              </button>
            )}
          </div>
        </div>
      </section>


      {/* Customer Reviews Section */}
      <section className="section container reviews-section">
        <div className="reviews-section-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h3 style={{ margin: 0 }}>Customer Reviews & Ratings</h3>
              {averageRating && (
                <span className="product-rating-badge" style={{ fontSize: "14px", padding: "4px 10px" }}>
                  ★ {averageRating} / 5.0 ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              )}
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {reviews.length > 0
                ? `${reviews.length} verified customer ${reviews.length === 1 ? "review" : "reviews"} for this handcrafted hamper`
                : "No customer reviews yet. Be the first to review after purchasing!"}
            </p>
          </div>

          <div>
            {currentUser ? (
              <Link
                to={`/review/${product.product_id || product.productId || id}`}
                state={{ productName: product.product_name || product.productName }}
                className="btn btn-secondary btn-sm"
              >
                ★ Review This Hamper
              </Link>
            ) : (
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign in to Review
              </Link>
            )}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="reviews-grid">
            {reviews.map((rev) => (
              <div key={rev.id || rev.reviewId} className="card review-card-item">
                <div className="review-card-top">
                  <div>
                    <strong>{rev.customerName || "Verified Customer"}</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span className="review-stars" style={{ color: "#f59e0b" }}>
                        {"★".repeat(rev.rating)}{"☆".repeat(Math.max(0, 5 - rev.rating))}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-primary)" }}>
                        {rev.rating}/5
                      </span>
                    </div>
                  </div>
                  <span className="review-date muted" style={{ fontSize: "12px" }}>
                    {rev.createdAt?.toDate
                      ? rev.createdAt.toDate().toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Verified Buyer"}
                  </span>
                </div>
                {rev.title && (
                  <h4 style={{ fontSize: "15px", margin: "10px 0 4px", color: "var(--color-text)" }}>
                    {rev.title}
                  </h4>
                )}
                <p className="review-text" style={{ fontSize: "13.5px", color: "var(--color-muted)", lineHeight: 1.5 }}>
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
