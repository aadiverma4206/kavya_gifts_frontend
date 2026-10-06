import { useEffect, useState } from "react";
import { getAllProducts } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import CategoryCard from "../components/CategoryCard.jsx";
import "./Home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllProducts()
      .then(setProducts)
      .catch(() => setError("Could not load products right now."))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map((p) => p.category))].filter(Boolean);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero container">
        <div className="hero-text">
          <h1>Gifts that feel like a warm hug</h1>
          <p className="muted">
            Handpicked hampers for Diwali, weddings, birthdays, and every occasion worth
            celebrating — crafted with love, delivered with care.
          </p>
          <div className="hero-actions">
            <a href="#best-selling" className="btn btn-primary">
              Shop Hampers
            </a>
            <a href="#occasions" className="btn btn-secondary">
              Explore Occasions
            </a>
          </div>
        </div>
        <div className="hero-image-placeholder" />
      </section>

      {/* ---------- Shop by Occasion ---------- */}
      <section className="section container" id="occasions">
        <h2>Shop by Occasion</h2>
        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
        </div>
      </section>

      {/* ---------- Best Selling Hampers ---------- */}
      <section className="section container" id="best-selling">
        <h2>Best Selling Hampers</h2>
        {loading && <p className="muted">Loading hampers...</p>}
        {error && <p className="muted">{error}</p>}
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
