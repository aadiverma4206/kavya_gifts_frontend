import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import {
  getAllReviewsForOwner,
  updateReviewStatus,
  deleteReview,
} from "../../services/reviewService.js";

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  function loadReviews() {
    setLoading(true);
    getAllReviewsForOwner()
      .then((data) => setReviews(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleSetStatus(rev, newStatus) {
    try {
      await updateReviewStatus(rev.reviewId || rev.id, newStatus);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === rev.id || r.reviewId === rev.reviewId
            ? { ...r, status: newStatus }
            : r
        )
      );
    } catch (err) {
      alert("Failed to update review status: " + err.message);
    }
  }

  async function handleDelete(rev) {
    if (!window.confirm("Permanently delete this customer review?")) return;
    try {
      await deleteReview(rev.reviewId || rev.id);
      setReviews((prev) => prev.filter((r) => r.id !== rev.id && r.reviewId !== rev.reviewId));
    } catch (err) {
      alert("Failed to delete review: " + err.message);
    }
  }

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <OwnerLayout
      title="Product Review Moderation"
      subtitle="Inspect customer ratings, approve unboxing feedback, or hide inappropriate comments"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Moderation</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <button onClick={loadReviews} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading reviews...</p>
      ) : (
        <div className="card owner-table-card">
          {filteredReviews.length === 0 ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
              No reviews match the selected filter.
            </p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Hamper</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th>Status</th>
                    <th>Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((rev) => (
                    <tr key={rev.id || rev.reviewId}>
                      <td><strong>{rev.reviewId}</strong></td>
                      <td><strong>{rev.productName}</strong></td>
                      <td>
                        {rev.customerName}
                        <span className="muted" style={{ display: "block", fontSize: "11px" }}>
                          {rev.customerId || ""}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                          {"★".repeat(rev.rating)}
                        </span>{" "}
                        ({rev.rating}/5)
                      </td>
                      <td style={{ maxWidth: "260px", fontSize: "13px" }}>
                        {rev.title && (
                          <strong style={{ display: "block", marginBottom: "2px", color: "var(--color-primary)" }}>
                            {rev.title}
                          </strong>
                        )}
                        "{rev.comment}"
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            rev.status === "approved"
                              ? "delivered"
                              : rev.status === "rejected" || rev.status === "hidden"
                              ? "cancelled"
                              : "packed"
                          }`}
                        >
                          {rev.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {rev.status !== "approved" && (
                            <button
                              onClick={() => handleSetStatus(rev, "approved")}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#166534" }}
                              title="Approve and show on product page"
                            >
                              ✓ Approve
                            </button>
                          )}
                          {rev.status !== "rejected" && (
                            <button
                              onClick={() => handleSetStatus(rev, "rejected")}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#b91c1c" }}
                              title="Reject review"
                            >
                              ✗ Reject
                            </button>
                          )}
                          {rev.status !== "hidden" && (
                            <button
                              onClick={() => handleSetStatus(rev, "hidden")}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#d97706" }}
                              title="Hide from public view"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(rev)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#991b1b" }}
                            title="Delete review"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
