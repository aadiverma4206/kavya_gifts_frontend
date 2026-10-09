import { useState } from "react";
import { Link } from "react-router-dom";
import { toDirectImageUrl } from "../utils/driveImage.js";
import { formatCurrency } from "../utils/formatters.js";
import "./ProductCard.css";

const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Luxury%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function ProductCard({ product }) {
  const rawImg =
    product.thumbnail ||
    product.image_url ||
    product.image ||
    (Array.isArray(product.images) && product.images[0]) ||
    "";
  const [imgSrc, setImgSrc] = useState(() => toDirectImageUrl(rawImg) || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const productId = product.productId || product.product_id || product.id;
  const productName = product.productName || product.product_name || "Gift Hamper";
  const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;
  const originalPrice = product.originalPrice || product.original_price;
  const stock = product.stockQuantity !== undefined ? product.stockQuantity : product.stock_qty || product.stock;
  const isOutOfStock = stock !== undefined && Number(stock) <= 0;
  const categoryLabel = product.categoryName || product.category || "";

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <Link to={`/product/${productId}`} className="product-card card">
      <div className="product-image-wrap">
        <img
          src={imgSrc}
          alt={productName}
          loading="lazy"
          onError={handleImageError}
        />
        {isOutOfStock && <span className="product-badge out-of-stock">Sold Out</span>}
        {!isOutOfStock && originalPrice && Number(originalPrice) > price && (
          <span className="product-badge discount">
            {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
          </span>
        )}
      </div>
      <div className="product-card-body">
        <h4>{productName}</h4>
        <p className="muted">{product.shortDescription || product.description || "Artisanal handcrafted luxury gift hamper."}</p>
        <div className="product-price-row">
          <p className="product-price">{formatCurrency(price)}</p>
          {originalPrice && Number(originalPrice) > price && (
            <span className="product-original-price">{formatCurrency(originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
