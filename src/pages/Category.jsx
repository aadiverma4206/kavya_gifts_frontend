import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductsByCategory } from "../services/productService.js";
import ProductCard from "../components/ProductCard.jsx";
import LoadingSkeleton from "../components/common/LoadingSkeleton.jsx";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import "./Home.css";

export default function Category() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name || "");
  useDocumentTitle(`${decodedName} - Handcrafted Luxury Hampers | Kavya Gifting`);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [searchFilter, setSearchFilter] = useState("");
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getProductsByCategory(decodedName)
      .then((data) => {
        if (isMounted) setProducts(data || []);
      })
      .catch((err) => {
        console.error("Error loading category products:", err);
        if (isMounted) setError("Could not load products for this occasion. Please check your internet connection.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [decodedName, retryTrigger]);

  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    // Search query within category
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter((p) => {
        const pName = (p.productName || p.product_name || "").toLowerCase();
        const pDesc = (p.description || p.shortDescription || "").toLowerCase();
        return pName.includes(q) || pDesc.includes(q);
      });
    }

    // Sort order
    if (sortBy === "price_asc") {
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }
    if (sortBy === "price_desc") {
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    if (sortBy === "name_asc") {
      return list.sort((a, b) => {
        const nameA = a.productName || a.product_name || "";
        const nameB = b.productName || b.product_name || "";
        return nameA.localeCompare(nameB);
      });
    }
    return list;
  }, [products, searchFilter, sortBy]);

  return (
    <div style={{ background: "linear-gradient(180deg, #fbf7f2 0%, #ffffff 100%)", minHeight: "80vh", paddingBottom: "60px" }}>
      {/* Occasion Hero Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #7a1f2b 0%, #4a0d16 100%)",
          color: "#ffffff",
          padding: "48px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", background: "radial-gradient(circle, rgba(212, 160, 23, 0.25) 0%, transparent 70%)", borderRadius: "50%" }}></div>
        <div className="container" style={{ position: "relative", zIndex: 2, maxWidth: "760px", margin: "0 auto" }}>
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>
              <Link to="/" style={{ color: "#ffffff", textDecoration: "none" }}>Home</Link>
              {"  /  "}
              <Link to="/#occasions" style={{ color: "#ffffff", textDecoration: "none" }}>Occasions</Link>
              {"  /  "}
              <span style={{ color: "#fde68a", fontWeight: 600 }}>{decodedName}</span>
            </p>
          </nav>

          <span
            style={{
              display: "inline-block",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(4px)",
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "12px",
              color: "#fde68a",
            }}
          >
            Artisanal Collection
          </span>

          <h1
            style={{
              fontFamily: "var(--font-heading, 'Playfair Display', serif)",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              margin: "0 0 12px",
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
          >
            {decodedName} Hampers
          </h1>

          <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6, margin: 0 }}>
            Handcrafted with love, premium confections, and bespoke ribbons designed for timeless celebration.
          </p>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section className="section container" style={{ paddingTop: "32px" }}>
        {/* Controls Row */}
        <div
          className="catalog-header-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "22px", margin: 0, color: "var(--color-primary, #7a1f2b)" }}>
              {decodedName}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "13.5px" }}>
              {loading ? "Discovering artisanal hampers..." : `Showing ${filteredAndSorted.length} curated gift hampers`}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search in this occasion..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(122, 31, 43, 0.2)",
                fontSize: "13.5px",
                background: "#ffffff",
              }}
            />

            {products.length > 0 && (
              <select
                className="catalog-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort category hampers"
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "1px solid rgba(122, 31, 43, 0.2)",
                  fontSize: "13.5px",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <option value="default">Sort by: Curated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            )}
          </div>
        </div>

        {/* Loading Skeleton Grid */}
        {loading && (
          <div className="product-grid" aria-label="Loading category hampers">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="catalog-empty card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ marginBottom: "16px" }}>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setRetryTrigger((k) => k + 1)}
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSorted.length === 0 && (
          <div className="catalog-empty card" style={{ textAlign: "center", padding: "50px 20px" }}>
            <p style={{ fontSize: "42px", margin: "0 0 12px" }}>🎁</p>
            <h3 style={{ color: "var(--color-primary, #7a1f2b)", margin: "0 0 8px" }}>
              No hampers found {searchFilter ? `for "${searchFilter}"` : `in "${decodedName}"`}
            </h3>
            <p className="muted" style={{ maxWidth: "460px", margin: "0 auto 20px" }}>
              Explore our full 100+ collection or discover other auspicious celebration hampers.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/" className="btn btn-primary">
                Explore All Hampers
              </Link>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="btn btn-secondary"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Product Cards Grid */}
        {!loading && !error && filteredAndSorted.length > 0 && (
          <div className="product-grid">
            {filteredAndSorted.map((product) => (
              <ProductCard
                key={product.product_id || product.productId || product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
