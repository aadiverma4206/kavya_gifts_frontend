import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductById } from "../services/productService.js";
import { useCart } from "../context/CartContext.jsx";
import { toDirectImageUrl } from "../utils/driveImage.js";
import "./Product.css";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getProductById(id)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError("This product could not be found.");
        } else {
          setProduct(data);
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

  if (loading) return <p className="container muted">Loading...</p>;
  if (error) return <p className="container muted">{error}</p>;
  if (!product) return null;

  function handleAddToCart() {
    addToCart(product, quantity);
    setAdded(true);
  }

  return (
    <section className="section container product-detail">
      <div className="product-detail-image">
        <img src={toDirectImageUrl(product.image_url)} alt={product.product_name} />
      </div>

      <div className="product-detail-info">
        <h1>{product.product_name}</h1>
        <p className="product-detail-price">₹{Number(product.price).toLocaleString("en-IN")}</p>
        <p className="muted product-detail-desc">{product.description}</p>

        <div className="quantity-selector">
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>

        <div className="product-detail-actions">
          <button className="btn btn-primary" onClick={handleAddToCart}>
            Add to Cart
          </button>
          {added && (
            <button className="btn btn-secondary" onClick={() => navigate("/cart")}>
              View Cart
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
