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
  const [giftWrappingPrice, setGiftWrappingPrice] = useState("120");
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

  const stats = useMemo(() => {
    const total = products.length;
    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      if ((p.status || "active") === "active") active++;
      const stock = Number(p.stockQuantity !== undefined ? p.stockQuantity : p.stock_qty) || 0;
      if (stock === 0) outOfStock++;
      else if (stock <= 5) lowStock++;
    });

    return { total, active, lowStock, outOfStock };
  }, [products]);

  function handleOpenCreate() {
    setEditingProduct(null);
    setProductName("");
    setCategoryName(categories[0] || "Diwali");
    setPrice("");
    setStockQuantity("25");
    setThumbnail("");
    setAdditionalImages("");
    setShortDescription("");
    setDescription("");
    setGiftWrappingAvailable(true);
    setGiftWrappingPrice("120");
    setFeatured(false);
    setStatus("active");
    setShowModal(true);
  }

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
    setGiftWrappingPrice(String(prod.giftWrappingPrice || 120));
    setFeatured(Boolean(prod.featured));
    setStatus(prod.status || "active");
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const extraUrls = additionalImages
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter(Boolean);
      const allImages = [thumbnail.trim(), ...extraUrls.filter((u) => u !== thumbnail.trim())];

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
              <h4>Low Stock (&le; 5)</h4>
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
              <table className="owner-table">
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
                  {filteredProducts.map((p) => {
                    const curStock = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (p.stock_qty !== undefined ? Number(p.stock_qty) : 0);
                    return (
                      <tr key={p.id}>
                        <td><strong style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.productId || p.product_id}</strong></td>
                        <td>
                          <img
                            src={toDirectImageUrl(p.thumbnail || p.image_url || p.image || (Array.isArray(p.images) && p.images[0])) || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80"}
                            alt={p.productName || p.product_name}
                            className="prod-thumb-cell"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80";
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
                          ) : curStock <= 5 ? (
                            <span className="stock-warning-badge low">{curStock} left (Low)</span>
                          ) : (
                            <span className="stock-warning-badge healthy">{curStock} in stock</span>
                          )}
                        </td>
                        <td>
                          <span className="muted" style={{ fontSize: "12px" }}>
                            {p.giftWrappingAvailable ? `+${formatCurrency(p.giftWrappingPrice || 120)}` : "No"}
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
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingProduct ? `Edit Hamper: ${editingProduct.productId || editingProduct.product_id}` : "Add New Luxury Hamper"}</h3>
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
