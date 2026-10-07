import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import {
  getAllProductsForOwner,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/productService";
import { getActiveCategories } from "../../services/categoryService";
import { toDirectImageUrl } from "../../utils/driveImage";
import "./ProductManagement.css";

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form Fields conforming to exact schema
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
  const [feedbackMsg, setFeedbackMsg] = useState("");

  function loadData() {
    setLoading(true);
    Promise.all([getAllProductsForOwner(), getActiveCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

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
    setStockQuantity(String(prod.stockQuantity || prod.stock_qty));
    const mainThumb = prod.thumbnail || prod.image_url || "";
    setThumbnail(mainThumb);
    const extra = (prod.images || []).filter((img) => img !== mainThumb).join("\n");
    setAdditionalImages(extra);
    setShortDescription(prod.shortDescription || "");
    setDescription(prod.description);
    setGiftWrappingAvailable(prod.giftWrappingAvailable !== undefined ? prod.giftWrappingAvailable : true);
    setGiftWrappingPrice(String(prod.giftWrappingPrice || 120));
    setFeatured(Boolean(prod.featured));
    setStatus(prod.status || "active");
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg("");

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
        setFeedbackMsg(`Updated hamper ${editingProduct.productId || editingProduct.product_id}!`);
      } else {
        const created = await createProduct(payload);
        setFeedbackMsg(`Created new hamper ${created.productId}!`);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      console.error("Save product error:", err);
      alert(err.message || "Could not save product.");
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
    } catch (err) {
      alert("Failed to toggle status.");
    }
  }

  async function handleDelete(prod) {
    if (!window.confirm(`Are you sure you want to delete ${prod.productName || prod.product_name} (${prod.productId || prod.product_id})?`)) {
      return;
    }
    try {
      await deleteProduct(prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (err) {
      alert("Failed to delete product.");
    }
  }

  const filteredProducts = products.filter((p) => {
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

  return (
    <OwnerLayout
      title="Product Catalog Management"
      subtitle="Add, edit, adjust stock quantities, and manage gift wrapping for all hampers"
      actionButton={
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Add New Hamper
        </button>
      }
    >
      {feedbackMsg && <div className="auth-alert success">{feedbackMsg}</div>}

      {/* Search & Filter Header Bar */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
          <input
            type="text"
            placeholder="Search by Hamper Name, ID (HAM-...), or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          >
            <option value="all">All Occasions ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          🔄 Refresh Catalog
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading catalog hampers...</p>
      ) : (
        <div className="card owner-table-card">
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Image</th>
                  <th>Hamper Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Gift Wrap</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.productId || p.product_id}</strong></td>
                    <td>
                      <img
                        src={toDirectImageUrl(p.thumbnail || p.image_url)}
                        alt={p.productName || p.product_name}
                        style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }}
                      />
                    </td>
                    <td>
                      <strong>{p.productName || p.product_name}</strong>
                      {p.featured && (
                        <span style={{ marginLeft: "6px", fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px" }}>
                          Featured
                        </span>
                      )}
                    </td>
                    <td>{p.categoryName || p.category}</td>
                    <td>₹{p.price.toLocaleString("en-IN")}</td>
                    <td>{p.stockQuantity || p.stock_qty} units</td>
                    <td>
                      <span className="muted" style={{ fontSize: "12px" }}>
                        {p.giftWrappingAvailable ? `₹${p.giftWrappingPrice || 120}` : "No"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${p.status === "active" ? "delivered" : "cancelled"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className="btn btn-secondary btn-sm"
                        >
                          {p.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#991b1b" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Edit / Add Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="card modal-card">
            <h3>{editingProduct ? `Edit ${editingProduct.productId || editingProduct.product_id}` : "Add New Hamper"}</h3>

            <form onSubmit={handleSave} className="auth-form" style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Hamper Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Diwali Mithai & Diya Hamper"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Occasion Category *</label>
                  <input
                    type="text"
                    list="categoryList"
                    placeholder="Diwali, Wedding, Corporate"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                  />
                  <datalist id="categoryList">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Price (₹ INR) *</label>
                  <input
                    type="number"
                    placeholder="1999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Catalog Status *</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Image Thumbnail URL *</label>
                <input
                  type="url"
                  placeholder="Direct image URL or Google Drive link"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Additional Gallery Images (one URL per line)</label>
                <textarea
                  rows="2"
                  placeholder="https://images.unsplash.com/...&#10;https://drive.google.com/..."
                  value={additionalImages}
                  onChange={(e) => setAdditionalImages(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Short Summary / Catchphrase</label>
                <input
                  type="text"
                  placeholder="Brief tagline for catalogue cards"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Full Description *</label>
                <textarea
                  rows="3"
                  placeholder="Describe the artisan contents of this festive gift hamper..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                  <input
                    type="checkbox"
                    id="wrapCheck"
                    checked={giftWrappingAvailable}
                    onChange={(e) => setGiftWrappingAvailable(e.target.checked)}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <label htmlFor="wrapCheck" style={{ margin: 0 }}>Gift Wrapping Available</label>
                </div>

                <div className="form-group">
                  <label>Gift Wrap Fee (₹)</label>
                  <input
                    type="number"
                    value={giftWrappingPrice}
                    onChange={(e) => setGiftWrappingPrice(e.target.value)}
                    disabled={!giftWrappingAvailable}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="featCheck"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <label htmlFor="featCheck" style={{ margin: 0 }}>Mark as Featured Hamper on Homepage</label>
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? "Saving Hamper..." : editingProduct ? "Save Changes" : "Create Hamper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
