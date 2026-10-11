import { useEffect, useState, useMemo } from "react";
import { getActiveProducts } from "../services/productService.js";
import { getActiveCategories } from "../services/categoryService.js";
import ProductCard from "../components/ProductCard.jsx";
import CategoryCard from "../components/CategoryCard.jsx";
import GiftBoxCanvas from "../components/three/GiftBoxCanvas.jsx";
import LoadingSkeleton from "../components/common/LoadingSkeleton.jsx";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { filterAndSortProducts } from "../utils/searchFilter.js";
import "./Home.css";

const PAGE_SIZE = 12;

export default function Home() {
  useDocumentTitle("Home - Handcrafted Luxury Gifts");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, filter, sort & pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getActiveProducts(), getActiveCategories()])
      .then(([prods, cats]) => {
        if (!isMounted) return;
        setProducts(prods);
        const rawCats = cats && cats.length > 0
          ? cats.map((c) => (typeof c === "string" ? c : c.categoryName || c.name || c.category_name || "")).filter(Boolean)
          : prods.map((p) => p.categoryName || p.category).filter(Boolean);
        setCategories([...new Set(rawCats)]);
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

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(products, {
      searchQuery,
      selectedCategory,
      sortBy,
    });
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Paginated slice
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <>
      {/* ---------- Hero with 3D Three.js Animated Gift Box ---------- */}
      <section className="hero container">
        <div className="hero-text">
          <span className="auth-tag">Artisan Handcrafted Hampers</span>
          <h1>Gifts that feel like a warm hug</h1>
          <p className="muted">
            Explore 100+ bespoke handcrafted gift hampers for Diwali, weddings, birthdays,
            anniversaries, and corporate celebrations — crafted with love, delivered with care.
          </p>
          <div className="hero-actions">
            <a href="#catalog" className="btn btn-primary">
              Explore 100+ Hampers
            </a>
            <a href="#occasions" className="btn btn-secondary">
              Shop by Occasion
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
          {categories.slice(0, 8).map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
        </div>
      </section>

      {/* ---------- Best Selling & Full Catalog (100+ Hampers) ---------- */}
      <section className="section container" id="catalog">
        <div className="catalog-header-row">
          <div>
            <h2>Luxury Gift Hampers Collection</h2>
            <p className="muted">
              {loading
                ? "Loading our luxury collection..."
                : `Showing ${displayedProducts.length} of ${filteredProducts.length} handcrafted hampers`}
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="catalog-controls">
            <div className="catalog-search-wrap">
              <input
                type="text"
                className="catalog-search-input"
                placeholder="Search 100+ hampers, sweets, perfumes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="catalog-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort hampers"
            >
              <option value="default">Sort by: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="category-filter-chips" role="tablist" aria-label="Category filter">
          <button
            type="button"
            className={`category-chip ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => handleCategorySelect("all")}
          >
            All Hampers ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => handleCategorySelect(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="product-grid" aria-label="Loading hampers">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {error && <p className="muted">{error}</p>}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="catalog-empty card">
            <p className="catalog-empty-icon">🎁</p>
            <h3>No hampers found matching your criteria</h3>
            <p className="muted">Try adjusting your search query or choosing another category.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {!loading && !error && displayedProducts.length > 0 && (
          <>
            <div className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard key={product.product_id || product.productId || product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="load-more-wrap">
                <button
                  type="button"
                  className="btn btn-primary load-more-btn"
                  onClick={handleLoadMore}
                >
                  Load More Hampers ({filteredProducts.length - displayedProducts.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
