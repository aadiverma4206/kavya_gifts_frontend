import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  getAllCategoriesForOwner,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";
import { notify } from "../../utils/notify";
import "./CategoryManagement.css";

export default function CategoryManagement() {
  useDocumentTitle("Occasion Categories - Owner Portal");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("1");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);

  function loadCats() {
    setLoading(true);
    getAllCategoriesForOwner()
      .then((data) => setCategories(data || []))
      .catch((err) => {
        console.error("Could not load categories:", err);
        notify.error("Could not load categories. Please retry.");
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCats();
  }, []);

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => (c.status || "active") === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        (c.categoryName || c.name || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setSaving(true);
    try {
      const created = await createCategory({
        categoryName: categoryName.trim(),
        description: description.trim(),
        sortOrder: Number(sortOrder) || 0,
        status: "active",
      });
      notify.success(`Added occasion category "${created.categoryName}"!`);
      setMsg(`Added occasion category "${created.categoryName}" (${created.categoryId})!`);
      setCategoryName("");
      setDescription("");
      setSortOrder(String(categories.length + 2));
      loadCats();
    } catch (err) {
      notify.error(err.message || "Could not add category.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenEdit(cat) {
    setEditingCategory(cat);
    setEditName(cat.categoryName || cat.name || "");
    setEditDescription(cat.description || "");
    setEditSortOrder(String(cat.sortOrder ?? 1));
    setEditStatus(cat.status || "active");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setSavingEdit(true);
    try {
      await updateCategory(editingCategory.id, {
        categoryName: editName.trim(),
        name: editName.trim(),
        description: editDescription.trim(),
        sortOrder: Number(editSortOrder) || 0,
        status: editStatus,
      });
      notify.success(`Updated "${editName.trim()}" successfully!`);
      setMsg(`Updated category "${editName.trim()}" successfully!`);
      setEditingCategory(null);
      loadCats();
    } catch (err) {
      notify.error(err.message || "Could not update category.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggle(cat) {
    const nextStatus = cat.status === "active" ? "inactive" : "active";
    try {
      await updateCategory(cat.id, { status: nextStatus });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, status: nextStatus } : c))
      );
      notify.info(`Category status switched to ${nextStatus}.`);
    } catch (err) {
      notify.error("Failed to update category status.");
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete occasion category "${cat.categoryName || cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      notify.success("Category deleted.");
    } catch (err) {
      notify.error("Failed to delete category.");
    }
  }

  return (
    <OwnerLayout
      title="Occasion & Category Studio"
      subtitle="Curate gifting moments, seasonal festivals (Diwali, Weddings, Anniversaries), and sort sequences"
      actionButton={
        <button onClick={loadCats} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      }
    >
      <div className="category-mgmt-container">
        {msg && <div className="auth-alert success">{msg}</div>}

        {/* Stats Row */}
        <div className="category-stats-grid">
          <div className="category-stat-card">
            <div className="category-stat-icon">🏷️</div>
            <div className="category-stat-info">
              <h4>Total Occasions</h4>
              <p className="category-stat-number">{stats.total}</p>
            </div>
          </div>
          <div className="category-stat-card">
            <div className="category-stat-icon" style={{ background: "#f0fdf4" }}>✨</div>
            <div className="category-stat-info">
              <h4>Active on Store</h4>
              <p className="category-stat-number" style={{ color: "#166534" }}>{stats.active}</p>
            </div>
          </div>
          <div className="category-stat-card">
            <div className="category-stat-icon" style={{ background: "#fff7ed" }}>📦</div>
            <div className="category-stat-info">
              <h4>Archived / Draft</h4>
              <p className="category-stat-number" style={{ color: "#c2410c" }}>{stats.inactive}</p>
            </div>
          </div>
        </div>

        {/* Add Category Form Card */}
        <div className="category-creation-card">
          <div className="category-form-header">
            <span style={{ fontSize: "20px" }}>➕</span>
            <h3>Add New Occasion Category</h3>
          </div>
          <form onSubmit={handleAdd} className="auth-form">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Occasion Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Hampers, Corporate Gala, Housewarming"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Display Sort Priority</label>
                <input
                  type="number"
                  placeholder="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Occasion Tagline / Subtitle</label>
              <input
                type="text"
                placeholder="e.g. Handcrafted bespoke trunks filled with festive delights and warm wishes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "4px" }}
              disabled={saving}
            >
              {saving ? "Creating Occasion..." : "+ Publish Category"}
            </button>
          </form>
        </div>

        {/* Controls Bar: Search */}
        <div className="category-controls-bar">
          <input
            type="text"
            className="category-search-input"
            placeholder="🔍 Search occasions by name, slug or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="muted" style={{ fontSize: "13px" }}>
            Showing {filteredCategories.length} of {categories.length} occasions
          </span>
        </div>

        {/* Categories Table Card */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading occasions...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Sort</th>
                    <th>Category Name & Description</th>
                    <th>Slug ID</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>
                        No categories found matching "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="category-sort-pill">#{c.sortOrder || 0}</span>
                        </td>
                        <td>
                          <strong style={{ fontSize: "14.5px" }}>{c.categoryName || c.name}</strong>
                          {c.description && (
                            <span className="muted" style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>
                              {c.description}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="category-slug-chip">{c.slug || c.id}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${c.status === "active" ? "delivered" : "cancelled"}`}>
                            {c.status || "active"}
                          </span>
                        </td>
                        <td>
                          <div className="category-actions-group" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="btn-edit-action"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggle(c)}
                              className={`btn-toggle-action ${c.status === "active" ? "active-btn" : "inactive-btn"}`}
                            >
                              {c.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              className="btn-delete-action"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="modal-backdrop" onClick={() => setEditingCategory(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "var(--color-primary, #7a1f2b)" }}>
                  Edit Occasion Category
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="auth-form">
                <div className="form-group">
                  <label>Occasion Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Occasion Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontFamily: "inherit",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Sort Priority</label>
                    <input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Display Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
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
