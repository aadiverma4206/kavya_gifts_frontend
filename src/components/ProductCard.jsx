import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Star, Heart, Check } from "lucide-react";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency, truncateText } from "../utils/formatters.js";
import { useCart } from "../context/CartContext.jsx";
import { notify } from "../utils/notify.js";
import "./ProductCard.css";

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Luxury%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!product) return null;

  const rawImg =
    product.thumbnail ||
    product.image_url ||
    product.image ||
    (Array.isArray(product.images) && product.images[0]) ||
    "";
  const [imgSrc, setImgSrc] = useState(() => toDirectImageUrl(rawImg) || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgSrc(toDirectImageUrl(rawImg) || FALLBACK_IMAGE);
    setImgError(false);
  }, [rawImg]);

  const productId = product.productId || product.product_id || product.id || "";
  const productName = product.productName || product.product_name || "Gift Hamper";
  const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;
  const originalPriceRaw = product.originalPrice || product.original_price;
  const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : 0;
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const stock = product.stockQuantity !== undefined ? product.stockQuantity : product.stock_qty || product.stock;
  const isOutOfStock = stock !== undefined && Number(stock) <= 0;
  const categoryLabel = product.categoryName || product.category || "";
  const rating = product.rating || 4.9;
  const reviewCount = product.reviewsCount || product.reviewCount || 28;

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    try {
      addToCart(product, 1);
      setAdded(true);
      notify.success(`Added ${productName} to your cart`);
      setTimeout(() => setAdded(false), 1600);
    } catch {
      notify.error(null, "Could not add item to cart");
    }
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite((prev) => !prev);
    notify.info(!isFavorite ? "Saved to your wish list!" : "Removed from wish list.");
  };

  return (
    <div className="product-card-wrap">
      <Link
        to={`/product/${productId}`}
        className="product-card"
        aria-label={`View ${productName} details, priced at ${formatCurrency(price)}`}
      >
        <div className="product-image-wrap">
          <img
            src={imgSrc}
            alt={productName}
            loading="lazy"
            onError={handleImageError}
            className="product-image"
          />

          {/* Badges Overlay */}
          <div className="product-badge-overlay-top">
            {categoryLabel && <span className="product-category-pill">{categoryLabel}</span>}
            <div className="badge-right-group">
              {isOutOfStock && <span className="product-badge out-of-stock">Sold Out</span>}
              {!isOutOfStock && hasDiscount && discountPercent > 0 && (
                <span className="product-badge discount">{discountPercent}% OFF</span>
              )}
            </div>
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            className={`wishlist-quick-btn ${isFavorite ? "active" : ""}`}
            onClick={handleToggleFavorite}
            aria-label="Save to wishlist"
          >
            <Heart size={15} fill={isFavorite ? "#e11d48" : "none"} color={isFavorite ? "#e11d48" : "#2a1815"} />
          </button>

          {/* Quick Add Button Hover Bar */}
          {!isOutOfStock && (
            <div className="quick-add-overlay">
              <button
                type="button"
                className={`quick-add-btn ${added ? "added" : ""}`}
                onClick={handleQuickAdd}
                aria-label="Quick add to bag"
              >
                {added ? (
                  <>
                    <Check size={14} /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} /> Quick Add
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="product-card-body">
          <div className="product-rating-row">
            <span className="rating-badge">
              <Star size={11} fill="#d4a347" color="#d4a347" />
              <span>{rating}</span>
            </span>
            <span className="rating-count">({reviewCount})</span>
            <span className="artisanal-tag">• Handcrafted</span>
          </div>

          <h4 className="product-title">{productName}</h4>

          <p className="product-description-muted">
            {truncateText(
              product.shortDescription || product.description || "Artisanal handcrafted luxury gift hamper.",
              80
            )}
          </p>

          <div className="product-price-row">
            <div className="price-stack">
              <span className="product-price">{formatCurrency(price)}</span>
              {hasDiscount && (
                <span className="product-original-price">{formatCurrency(originalPrice)}</span>
              )}
            </div>
            {hasDiscount && (
              <span className="save-badge">Save {formatCurrency(originalPrice - price)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
