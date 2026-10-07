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
    </OwnerLayout>
  );
}
