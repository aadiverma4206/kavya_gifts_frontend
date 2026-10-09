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
  useDocumentTitle(`${decodedName} - Handcrafted Luxury Hampers`);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("default");

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
        if (isMounted) setError("Could not load products for this category.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [decodedName]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "price_asc") {
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }
    if (sortBy === "price_desc") {
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    if (sortBy === "name_asc") {
      return list.sort((a, b) => (a.productName || "").localeCompare(b.productName || ""));
    }
    return list;
  }, [products, sortBy]);

  return (
    <section className="section container">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: "20px" }}>
        <p className="muted" style={{ fontSize: "14px" }}>
          <Link to="/" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Home</Link>
          {" / "}
          <Link to="/#occasions" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Occasions</Link>
          {" / "}
          <span>{decodedName}</span>
        </p>
      </nav>

      <div className="catalog-header-row">
        <div>
          <h2>{decodedName}</h2>
          <p className="muted">
            {loading ? "Discovering artisanal hampers..." : `Showing ${sortedProducts.length} curated hampers`}
          </p>
        </div>

        {products.length > 0 && (
          <div className="catalog-controls">
            <select
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort category hampers"
            >
              <option value="default">Sort by: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="product-grid" aria-label="Loading category hampers">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      )}

      {error && <p className="muted">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className="catalog-empty card">
          <p className="catalog-empty-icon">🎁</p>
          <h3>No hampers found in "{decodedName}"</h3>
          <p className="muted">Browse our full 100+ collection to find the perfect gift.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
            Explore All 100+ Hampers
          </Link>
        </div>
      )}

      {!loading && !error && sortedProducts.length > 0 && (
        <div className="product-grid">
          {sortedProducts.map((product) => (
            <ProductCard key={product.product_id || product.productId || product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
