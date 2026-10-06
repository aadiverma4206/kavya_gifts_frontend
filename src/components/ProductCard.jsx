import { Link } from "react-router-dom";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.product_id}`} className="product-card card">
      <div className="product-image-wrap">
        <img src={toDirectImageUrl(product.image_url)} alt={product.product_name} />
      </div>
      <div className="product-card-body">
        <h4>{product.product_name}</h4>
        <p className="muted">{product.description}</p>
        <p className="product-price">₹{product.price.toLocaleString("en-IN")}</p>
      </div>
    </Link>
  );
}
