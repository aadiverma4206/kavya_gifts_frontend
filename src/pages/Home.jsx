import { useEffect, useState } from "react";
import { getActiveProducts } from "../services/productService.js";
import { getActiveCategories } from "../services/categoryService.js";
import ProductCard from "../components/ProductCard.jsx";
import CategoryCard from "../components/CategoryCard.jsx";
import GiftBoxCanvas from "../components/three/GiftBoxCanvas.jsx";
import "./Home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getActiveProducts(), getActiveCategories()])
      .then(([prods, cats]) => {
        if (!isMounted) return;
        setProducts(prods);
        setCategories(
          cats && cats.length > 0
            ? cats
            : [...new Set(prods.map((p) => p.category))].filter(Boolean)
        );
      })
      .catch((err) => {
        console.error("Error loading home page data:", err);
        if (isMounted) setError("Could not load products right now.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {/* ---------- Hero with 3D Three.js Animated Gift Box ---------- */}
      <section className="hero container">
        <div className="hero-text">
          <span className="auth-tag">Artisan Handcrafted Hampers</span>
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

        {/* Ultra-Modern 3D Interactive Luxury Gift Hamper */}
        <div className="hero-3d-box card">
          <GiftBoxCanvas autoRotate={true} interactive={true} />
        </div>
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
        {!loading && !error && products.length === 0 && (
          <p className="muted">No hampers available at the moment.</p>
        )}
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.product_id || product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
