import { Link } from "react-router-dom";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const productId = product.product_id || product.id;
  const price = typeof product.price === "number" ? product.price : Number(product.price) || 0;

  return (
    <Link to={`/product/${productId}`} className="product-card card">
      <div className="product-image-wrap">
        <img src={toDirectImageUrl(product.image_url)} alt={product.product_name} />
      </div>
      <div className="product-card-body">
        <h4>{product.product_name}</h4>
        <p className="muted">{product.description}</p>
        <p className="product-price">₹{price.toLocaleString("en-IN")}</p>
      </div>
    </Link>
  );
}
