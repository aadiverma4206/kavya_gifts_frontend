import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import {
  getAllCategoriesForOwner,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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
      .then((data) => setCategories(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCats();
  }, []);

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
      setMsg(`Added occasion category "${created.categoryName}" (${created.categoryId})!`);
      setCategoryName("");
      setDescription("");
      setSortOrder(String(categories.length + 2));
      loadCats();
    } catch (err) {
      alert(err.message || "Could not add category.");
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
      setMsg(`Updated category "${editName.trim()}" successfully!`);
      setEditingCategory(null);
      loadCats();
    } catch (err) {
      alert(err.message || "Could not update category.");
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
    } catch (err) {
      alert("Failed to update category.");
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.categoryName || cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert("Failed to delete category.");
    }
  }

  return (
    <OwnerLayout
      title="Category & Occasion Management"
      subtitle="Organize hampers into festive celebrations (Diwali, Weddings, Anniversaries)"
    >
      {msg && <div className="auth-alert success">{msg}</div>}

      <div className="card owner-table-card" style={{ marginBottom: "28px" }}>
        <h3>Add New Occasion Category</h3>
        <form onSubmit={handleAdd} className="auth-form" style={{ marginTop: "16px" }}>
          <div className="form-row">
            <div className="form-group">
              <label>Occasion Category Name *</label>
              <input
                type="text"
                placeholder="e.g. Raksha Bandhan, New Year, Baby Shower"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Display Sort Order (Number)</label>
              <input
                type="number"
                placeholder="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Occasion Description</label>
            <input
              type="text"
              placeholder="e.g. Thoughtful gift hampers curated for auspicious celebrations"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={saving}>
            {saving ? "Adding..." : "+ Create Category"}
          </button>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading occasions...</p>
      ) : (
        <div className="card owner-table-card">
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Sort Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.categoryId || c.id}</strong></td>
                    <td>
                      <strong>{c.categoryName || c.name}</strong>
                      {c.description && (
                        <span className="muted" style={{ display: "block", fontSize: "12px" }}>
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td><code style={{ background: "#fbf3e7", padding: "2px 6px", borderRadius: "4px" }}>{c.slug || c.id}</code></td>
                    <td>#{c.sortOrder || 0}</td>
                    <td>
                      <span className={`status-pill ${c.status === "active" ? "delivered" : "cancelled"}`}>
                        {c.status || "active"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleOpenEdit(c)} className="btn btn-secondary btn-sm">
                          Edit
                        </button>
                        <button onClick={() => handleToggle(c)} className="btn btn-secondary btn-sm">
                          {c.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleDelete(c)} className="btn btn-secondary btn-sm" style={{ color: "#991b1b" }}>
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

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="modal-backdrop">
          <div className="card modal-card" style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Edit Category: {editingCategory.categoryId || editingCategory.id}</h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="auth-form" style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingCategory(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}

