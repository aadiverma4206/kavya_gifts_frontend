import { Link } from "react-router-dom";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const productId = product.productId || product.product_id || product.id;
  const productName = product.productName || product.product_name || "Gift Hamper";
  const image = product.image || product.thumbnail || product.image_url;
  const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;

  return (
    <Link to={`/product/${productId}`} className="product-card card">
      <div className="product-image-wrap">
        <img src={toDirectImageUrl(image)} alt={productName} />
      </div>
      <div className="product-card-body">
        <h4>{productName}</h4>
        <p className="muted">{product.shortDescription || product.description}</p>
        <p className="product-price">₹{price.toLocaleString("en-IN")}</p>
      </div>
    </Link>
  );
}
