import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProductsByCategory } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import "./Home.css";

export default function Category() {
  const { name } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProductsByCategory(name)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <section className="section container">
      <h2>{name}</h2>
      {loading && <p className="muted">Loading...</p>}
      {!loading && products.length === 0 && (
        <p className="muted">No hampers found in this category yet.</p>
      )}
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
    </section>
  );
}
