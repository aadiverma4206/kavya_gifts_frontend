import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProductsByCategory } from "../services/productService.js";
import ProductCard from "../components/ProductCard.jsx";
import "./Home.css";

export default function Category() {
  const { name } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    getProductsByCategory(name)
      .then((data) => {
        if (isMounted) setProducts(data);
      })
      .catch((err) => {
        console.error("Error loading category products:", err);
        if (isMounted) setError("Could not load products for this category.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [name]);

  return (
    <section className="section container">
      <h2>{name}</h2>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="muted">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="muted">No hampers found in this category yet.</p>
      )}
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.product_id || product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
