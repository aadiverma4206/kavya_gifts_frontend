import { useEffect, useState, useMemo } from "react";
import { Sparkles, Search, ArrowRight, ShieldCheck, Heart, Award, Star, Quote, Truck, CheckCircle2, Gift } from "lucide-react";
import { getActiveProducts } from "../services/productService.js";
import { getActiveCategories } from "../services/categoryService.js";
import ProductCard from "../components/ProductCard.jsx";
import CategoryCard from "../components/CategoryCard.jsx";
import GiftBoxCanvas from "../components/three/GiftBoxCanvas.jsx";
import LoadingSkeleton from "../components/common/LoadingSkeleton.jsx";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { filterAndSortProducts } from "../utils/searchFilter.js";
import "./Home.css";

/**
 * Default number of hampers rendered initially in the infinite catalog view.
 * @constant {number}
 */
const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Featured patron testimonials celebrating hampers for Diwali, corporate, and weddings.
 * @constant {Array<{ name: string, city: string, rating: number, text: string }>}
 */
const TESTIMONIALS = [
  {
    name: "Ananya Sharma",
    city: "Mumbai",
    rating: 5,
    text: "The Diwali hamper was breathtaking! The velvet box, engraved candle, and rich chocolates arrived in pristine condition. My clients were thoroughly impressed.",
  },
  {
    name: "Vikramaditya Roy",
    city: "Bengaluru",
    rating: 5,
    text: "Ordered 85 customized corporate gift boxes. Every single one had our personalized note and impeccable silk ribbons. Outstanding craftsmanship!",
  },
  {
    name: "Meera & Siddharth",
    city: "New Delhi",
    rating: 5,
    text: "We chose Kavya for our wedding return gifts. The artisanal presentation and fragrant keepsakes left everyone asking where we got them from.",
  },
];

/**
 * Aggregates live product counts indexed by individual category name.
 * @param {Array<Object>} productsList - Full array of active hamper products.
 * @returns {Record<string, number>} Map of category names to active product counts.
 */
function calculateCategoryCounts(productsList) {
  if (!Array.isArray(productsList)) return {};
  return productsList.reduce((acc, p) => {
    const cat = p.categoryName || p.category;
    if (cat) acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
}

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

  /** Asynchronously fetches live published hamper products and categories */
  useEffect(() => {
    let isMounted = true;
    Promise.all([getActiveProducts(), getActiveCategories()])
      .then(([prods, cats]) => {
        if (!isMounted) return;
        setProducts(prods);
        const rawCats =
          cats && cats.length > 0
            ? cats
                .map((c) =>
                  typeof c === "string"
                    ? c
                    : c.categoryName || c.name || c.category_name || ""
                )
                .filter(Boolean)
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

  // Calculate dynamic category item counts
  const categoryCounts = useMemo(() => calculateCategoryCounts(products), [products]);

  /** Registers global Escape key shortcut to clear active search query */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    return filterAndSortProducts(safeProducts, {
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

  /**
   * Increments current catalog pagination slice by PAGE_SIZE items.
   */
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  /**
   * Clears active search term and restores category filter and sorting to default state.
   */
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("default");
    setVisibleCount(PAGE_SIZE);
  };

  /**
   * Filters catalog by chosen occasion category and resets pagination offset.
   * @param {string} cat - Category name or "all".
   */
  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="home-page-container">
      {/* ---------- Modern Luxury Hero with Interactive 3D Gift Hamper ---------- */}
      <section className="hero container">
        <div className="hero-text">
          <div className="hero-tag-badge">
            <Sparkles size={14} className="hero-sparkle" />
            <span>Artisan Luxury Gifting Studio</span>
          </div>

          <h1 className="hero-heading">
            Gifts That Leave an <span className="hero-highlight">Unforgettable</span> Impression
          </h1>

          <p className="hero-subtext">
            Discover 100+ bespoke handcrafted gift hampers for festive celebrations, royal weddings,
            milestones, and corporate luxury — packed with care, delivered pan-India.
          </p>

          <div className="hero-actions">
            <a href="#catalog" className="btn btn-primary hero-btn-main">
              Explore 100+ Hampers <ArrowRight size={16} />
            </a>
            <a href="#occasions" className="btn btn-secondary hero-btn-sec">
              Shop by Occasion
            </a>
          </div>

          <div className="hero-proof-row">
            <div className="proof-avatar-group">
              <span className="proof-star">★</span>
              <span className="proof-rating-text">4.9/5 Rating</span>
            </div>
            <div className="proof-divider" />
            <div className="proof-stat">
              <strong>12,000+</strong> Hampers Delivered Across India
            </div>
          </div>
        </div>

        {/* 3D Interactive Luxury Gift Hamper */}
        <div className="hero-3d-box card">
          <GiftBoxCanvas autoRotate={true} interactive={true} />
        </div>
      </section>

      {/* ---------- Luxury Value Pillars & Trust Strip ---------- */}
      <section className="container" aria-label="Why Choose Kavya" style={{ margin: "24px auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", padding: "20px 24px", background: "rgba(122, 31, 43, 0.03)", borderRadius: "14px", border: "1px solid rgba(122, 31, 43, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Truck size={22} color="var(--color-primary, #7a1f2b)" />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>Pan-India Express</strong>
              <span className="muted" style={{ fontSize: "12px" }}>Temperature & shock protected</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ShieldCheck size={22} color="var(--color-primary, #7a1f2b)" />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>100% Curated Goodies</strong>
              <span className="muted" style={{ fontSize: "12px" }}>Pure gourmet & handcrafted keepsakes</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Gift size={22} color="var(--color-primary, #7a1f2b)" />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>Velvet & Wax Seal</strong>
              <span className="muted" style={{ fontSize: "12px" }}>Heirloom packaging presentation</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle2 size={22} color="var(--color-primary, #7a1f2b)" />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>Corporate Concierge</strong>
              <span className="muted" style={{ fontSize: "12px" }}>Custom bulk branding & GST invoice</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Shop by Occasion ---------- */}
      <section className="section container" id="occasions">
        <div className="section-header-row">
          <div>
            <span className="section-eyebrow">CURATED COLLECTIONS</span>
            <h2 className="section-main-heading">Shop by Occasion</h2>
          </div>
          <a href="#catalog" className="section-view-all">
            Browse All Hampers <ArrowRight size={14} />
          </a>
        </div>

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
            <span className="section-eyebrow">HANDCRAFTED CATALOG</span>
            <h2 className="section-main-heading">Luxury Gift Hampers Collection</h2>
            <p className="catalog-count-text">
              {loading
                ? "Loading our luxury collection..."
                : `Showing ${displayedProducts.length} of ${filteredProducts.length} handcrafted hampers`}
              {(searchQuery || selectedCategory !== "all") && (
                <span style={{ marginLeft: "8px", color: "var(--color-primary, #7a1f2b)", fontWeight: 600 }}>
                  (Filtered by {searchQuery ? `"${searchQuery}"` : ""}{searchQuery && selectedCategory !== "all" ? " in " : ""}{selectedCategory !== "all" ? selectedCategory : ""})
                </span>
              )}
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="catalog-controls">
            <div className="catalog-search-wrap">
              <Search size={16} className="catalog-search-icon" />
              <input
                type="text"
                className="catalog-search-input"
                aria-label="Search hampers by title, fragrance or sweet"
                title="Search hampers (Esc to clear)"
                placeholder="Search hampers, perfumes, sweets..."
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
                  aria-label="Clear search keywords"
                  title="Clear search query"
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
              <option value="default">Featured Selection</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Alphabetical (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="category-filter-chips" role="tablist" aria-label="Category filter">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "all"}
            className={`category-chip ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => handleCategorySelect("all")}
          >
            All Hampers ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`category-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => handleCategorySelect(cat)}
            >
              {cat} ({categoryCounts[cat] || 0})
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

        {error && <p className="catalog-error-msg">{error}</p>}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="catalog-empty card">
            <p className="catalog-empty-icon">🎁</p>
            <h3>No hampers found matching your search</h3>
            <p className="muted">Try adjusting your keywords or clearing the category filter.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {!loading && !error && displayedProducts.length > 0 && (
          <>
            <div className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.product_id || product.productId || product.id}
                  product={product}
                />
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

      {/* ---------- Luxury Patron Testimonials Section ---------- */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="testimonials-header">
            <span className="section-eyebrow">REVERED BY CELEBRATIONS</span>
            <h2 className="section-main-heading">What Our Patrons Say</h2>
            <p className="muted">Read heartwarming experiences from families and corporate leaders</p>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="testimonial-card card">
                <Quote size={28} className="testimonial-quote-icon" />
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#d4a347" color="#d4a347" />
                  ))}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="author-name">{t.name}</div>
                  <div className="author-city">{t.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
