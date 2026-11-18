import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  getAllProductsForOwner,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/productService";
import { getActiveCategories } from "../../services/categoryService";
import { toDirectImageUrl } from "../../utils/driveImage";
import { formatCurrency } from "../../utils/formatters";
import { notify } from "../../utils/notify";
import "./ProductManagement.css";

/**
 * Default fee in INR applied for bespoke gift wrapping when not customized.
 * @constant {number}
 */
const DEFAULT_GIFT_WRAP_FEE = 120;

/**
 * Threshold quantity below which a hamper is flagged as low inventory.
 * @constant {number}
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Default initial stock quantity for newly drafted luxury gift hampers.
 * @constant {number}
 */
const DEFAULT_STOCK_QUANTITY = 25;

/**
 * Image URL used as placeholder when hamper thumbnail is missing or breaks.
 * @constant {string}
 */
const FALLBACK_THUMBNAIL_URL = "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80";

/**
 * Computes aggregate catalog counts for active, low stock, and depleted products.
 * @param {Array<Object>} productsList - Full array of catalog products.
 * @param {number} [threshold=5] - Low stock threshold.
 * @returns {{ total: number, active: number, lowStock: number, outOfStock: number }}
 */
function calculateInventoryStats(productsList, threshold = 5) {
  if (!Array.isArray(productsList)) return { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
  const total = productsList.length;
  let active = 0;
  let lowStock = 0;
  let outOfStock = 0;

  productsList.forEach((p) => {
    if ((p.status || "active") === "active") active++;
    const stock = Number(p.stockQuantity !== undefined ? p.stockQuantity : p.stock_qty) || 0;
    if (stock === 0) outOfStock++;
    else if (stock <= threshold) lowStock++;
  });

  return { total, active, lowStock, outOfStock };
}

/**
 * Splits and cleans multiline or comma-separated gallery image URLs.
 * @param {string} thumbnailUrl - Primary thumbnail link.
 * @param {string} rawAdditionalText - Raw textarea string.
 * @returns {Array<string>} Unique list of image URLs.
 */
function parseGalleryImageUrls(thumbnailUrl, rawAdditionalText) {
  const thumb = (thumbnailUrl || "").trim();
  const extraUrls = (rawAdditionalText || "")
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter((u) => Boolean(u) && u !== thumb);
  return thumb ? [thumb, ...extraUrls] : extraUrls;
}

/**
 * Returns a stable and deterministic React key for catalog inventory table rows.
 * @param {Object} product - Product record.
 * @param {number} idx - Row index.
 * @returns {string} Unique React key.
 */
function getProductRowKey(product, idx) {
  return product.id || product.productId || product.product_id || `product-row-${idx}`;
}

export default function ProductManagement() {
  useDocumentTitle("Product Inventory - Owner Portal");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form Fields conforming to schema
  const [productName, setProductName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [additionalImages, setAdditionalImages] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [giftWrappingAvailable, setGiftWrappingAvailable] = useState(true);
  const [giftWrappingPrice, setGiftWrappingPrice] = useState(String(DEFAULT_GIFT_WRAP_FEE));
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([getAllProductsForOwner(), getActiveCategories()])
      .then(([prods, cats]) => {
        setProducts(prods || []);
        setCategories(cats || []);
      })
      .catch((err) => {
        console.error("Failed to load inventory:", err);
        notify.error("Could not load products inventory.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // Close hamper editor modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const stats = useMemo(() => calculateInventoryStats(products, LOW_STOCK_THRESHOLD), [products]);

  /**
   * Resets form fields to default state and opens creation modal.
   */
  function handleOpenCreate() {
    setEditingProduct(null);
    setProductName("");
    setCategoryName(categories[0] || "Diwali");
    setPrice("");
    setStockQuantity(String(DEFAULT_STOCK_QUANTITY));
    setThumbnail("");
    setAdditionalImages("");
    setShortDescription("");
    setDescription("");
    setGiftWrappingAvailable(true);
    setGiftWrappingPrice(String(DEFAULT_GIFT_WRAP_FEE));
    setFeatured(false);
    setStatus("active");
    setShowModal(true);
  }

  /**
   * Pre-populates form fields with existing product data and opens editor modal.
   * @param {Object} prod - Product record to edit.
   */
  function handleOpenEdit(prod) {
    setEditingProduct(prod);
    setProductName(prod.productName || prod.product_name);
    setCategoryName(prod.categoryName || prod.category);
    setPrice(String(prod.price));
    setStockQuantity(String(prod.stockQuantity !== undefined ? prod.stockQuantity : prod.stock_qty));
    const mainThumb = prod.thumbnail || prod.image_url || "";
    setThumbnail(mainThumb);
    const extra = (prod.images || []).filter((img) => img !== mainThumb).join("\n");
    setAdditionalImages(extra);
    setShortDescription(prod.shortDescription || "");
    setDescription(prod.description || "");
    setGiftWrappingAvailable(prod.giftWrappingAvailable !== undefined ? prod.giftWrappingAvailable : true);
    setGiftWrappingPrice(String(prod.giftWrappingPrice || DEFAULT_GIFT_WRAP_FEE));
    setFeatured(Boolean(prod.featured));
    setStatus(prod.status || "active");
    setShowModal(true);
  }

  /**
   * Validates form inputs, formats gallery images, and commits create or update mutation.
   * @param {React.FormEvent} e - Form submission event.
   */
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const allImages = parseGalleryImageUrls(thumbnail, additionalImages);

      const payload = {
        productName: productName.trim(),
        categoryName: categoryName.trim(),
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        thumbnail: thumbnail.trim(),
        images: allImages,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        giftWrappingAvailable: Boolean(giftWrappingAvailable),
        giftWrappingPrice: Number(giftWrappingPrice) || 0,
        featured: Boolean(featured),
        status,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        notify.success(`Updated hamper ${editingProduct.productId || editingProduct.product_id}!`);
      } else {
        const created = await createProduct(payload);
        notify.success(`Created new hamper ${created.productId}!`);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      console.error("Save product error:", err);
      notify.error(err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Toggles product visibility status between active and inactive in the customer storefront.
   * @param {Object} prod - Product record.
   */
  async function handleToggleStatus(prod) {
    const nextStatus = prod.status === "active" ? "inactive" : "active";
    try {
      await updateProduct(prod.id, { status: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: nextStatus } : p))
      );
      notify.info(`Hamper status set to ${nextStatus}.`);
    } catch (err) {
      notify.error("Failed to toggle status.");
    }
  }

  /**
   * Confirms and permanently deletes product item from catalog.
   * @param {Object} prod - Product record.
   */
  async function handleDelete(prod) {
    if (!window.confirm(`Are you sure you want to delete ${prod.productName || prod.product_name}?`)) {
      return;
    }
    try {
      await deleteProduct(prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      notify.success("Product deleted from catalog.");
    } catch (err) {
      notify.error("Failed to delete product.");
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory !== "all") {
        const cat = (p.categoryName || p.category || "").toLowerCase();
        if (cat !== filterCategory.toLowerCase()) return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const pid = (p.productId || p.product_id || "").toLowerCase();
      const name = (p.productName || p.product_name || "").toLowerCase();
      const cat = (p.categoryName || p.category || "").toLowerCase();
      return pid.includes(term) || name.includes(term) || cat.includes(term);
    });
  }, [products, filterCategory, searchTerm]);

  return (
    <OwnerLayout
      title="Product Catalog & Inventory Studio"
      subtitle="Manage luxury gift hampers, adjust live stock, upload gallery images, and configure bespoke wrapping"
      actionButton={
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Add New Hamper
        </button>
      }
    >
      <div className="prod-mgmt-container">
        {/* Inventory Stats */}
        <div className="prod-stats-grid">
          <div className="prod-stat-card">
            <div className="prod-stat-icon" style={{ background: "#fdf2f8", color: "#9d174d" }}>🎁</div>
            <div className="prod-stat-info">
              <h4>Total Hampers</h4>
              <p className="prod-stat-val" style={{ color: "var(--color-primary, #7a1f2b)" }}>{stats.total}</p>
            </div>
          </div>
          <div className="prod-stat-card">
            <div className="prod-stat-icon" style={{ background: "#ecfdf5", color: "#166534" }}>✨</div>
            <div className="prod-stat-info">
              <h4>Active on Store</h4>
              <p className="prod-stat-val" style={{ color: "#166534" }}>{stats.active}</p>
            </div>
          </div>
          <div className="prod-stat-card">
            <div className="prod-stat-icon" style={{ background: "#fffbeb", color: "#b45309" }}>⚠️</div>
            <div className="prod-stat-info">
              <h4>Low Stock (&le; {LOW_STOCK_THRESHOLD})</h4>
              <p className="prod-stat-val" style={{ color: "#b45309" }}>{stats.lowStock}</p>
            </div>
          </div>
          <div className="prod-stat-card">
            <div className="prod-stat-icon" style={{ background: "#fef2f2", color: "#991b1b" }}>🚫</div>
            <div className="prod-stat-info">
              <h4>Sold Out</h4>
              <p className="prod-stat-val" style={{ color: "#991b1b" }}>{stats.outOfStock}</p>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="prod-category-chips">
          <button
            type="button"
            className={`prod-chip-btn ${filterCategory === "all" ? "active" : ""}`}
            onClick={() => setFilterCategory("all")}
          >
            All Collections ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`prod-chip-btn ${filterCategory === c ? "active" : ""}`}
              onClick={() => setFilterCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1, maxWidth: "580px" }}>
            <input
              type="text"
              placeholder="🔍 Search by Hamper Name, ID (HAM-...), or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "10px 16px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "14px" }}
            />
          </div>

          <button onClick={loadData} className="btn btn-secondary btn-sm">
            🔄 Refresh Catalog
          </button>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading catalog hampers...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            <div className="owner-table-wrapper">
              <table className="owner-table" aria-label="Hamper catalog inventory table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Image</th>
                    <th>Hamper Name</th>
                    <th>Occasion</th>
                    <th>Price</th>
                    <th>Inventory Status</th>
                    <th>Gift Wrap</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, idx) => {
                    const curStock = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (p.stock_qty !== undefined ? Number(p.stock_qty) : 0);
                    return (
                      <tr key={getProductRowKey(p, idx)}>
                        <td><strong style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.productId || p.product_id}</strong></td>
                        <td>
                          <img
                            src={toDirectImageUrl(p.thumbnail || p.image_url || p.image || (Array.isArray(p.images) && p.images[0])) || FALLBACK_THUMBNAIL_URL}
                            alt={p.productName || p.product_name}
                            className="prod-thumb-cell"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = FALLBACK_THUMBNAIL_URL;
                            }}
                          />
                        </td>
                        <td>
                          <strong style={{ fontSize: "14px" }}>{p.productName || p.product_name}</strong>
                          {p.featured && (
                            <span style={{ marginLeft: "6px", fontSize: "10px", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "999px", fontWeight: "700" }}>
                              ★ FEATURED
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "13px" }}>{p.categoryName || p.category}</span>
                        </td>
                        <td>
                          <strong style={{ fontSize: "14px", color: "var(--color-primary, #7a1f2b)" }}>
                            {formatCurrency(p.price || 0)}
                          </strong>
                        </td>
                        <td>
                          {curStock <= 0 ? (
                            <span className="stock-warning-badge out">Sold Out</span>
                          ) : curStock <= LOW_STOCK_THRESHOLD ? (
                            <span className="stock-warning-badge low">{curStock} left (Low)</span>
                          ) : (
                            <span className="stock-warning-badge healthy">{curStock} in stock</span>
                          )}
                        </td>
                        <td>
                          <span className="muted" style={{ fontSize: "12px" }}>
                            {p.giftWrappingAvailable ? `+${formatCurrency(p.giftWrappingPrice || DEFAULT_GIFT_WRAP_FEE)}` : "No"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${p.status === "active" ? "delivered" : "cancelled"}`}>
                            {p.status || "active"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className="btn btn-secondary btn-sm"
                            >
                              {p.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#991b1b" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 id="modal-title">{editingProduct ? `Edit Hamper: ${editingProduct.productId || editingProduct.product_id}` : "Add New Luxury Hamper"}</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="auth-form">
                <div className="form-group">
                  <label>Hamper Title *</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Occasion Category *</label>
                    <select
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      min="1"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Stock Qty *</label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Primary Thumbnail Image URL *</label>
                  <input
                    type="url"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    required
                    placeholder="https://drive.google.com/file/d/... or direct image link"
                  />
                </div>

                <div className="form-group">
                  <label>Additional Gallery Image URLs (one per line)</label>
                  <textarea
                    rows={2}
                    value={additionalImages}
                    onChange={(e) => setAdditionalImages(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                </div>

                <div className="form-group">
                  <label>Short Description (1-2 sentences)</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Full Hamper Contents & Story</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    required
                  />
                </div>

                <div className="form-row" style={{ alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={giftWrappingAvailable}
                      onChange={(e) => setGiftWrappingAvailable(e.target.checked)}
                    />
                    Artisan Gift Wrapping Eligible
                  </label>

                  {giftWrappingAvailable && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px" }}>Wrapping Fee: ₹</span>
                      <input
                        type="number"
                        value={giftWrappingPrice}
                        onChange={(e) => setGiftWrappingPrice(e.target.value)}
                        style={{ width: "80px", padding: "6px" }}
                      />
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                    />
                    ★ Featured in Hero
                  </label>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving Hamper..." : "Save to Catalog"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
