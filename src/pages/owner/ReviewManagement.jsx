import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import {
  getAllReviewsForOwner,
  updateReviewStatus,
  deleteReview,
} from "../../services/reviewService";

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
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

  async function handleToggleStatus(rev) {
    const nextStatus = rev.status === "approved" ? "hidden" : "approved";
    try {
      await updateReviewStatus(rev.reviewId || rev.id, nextStatus);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === rev.id || r.reviewId === rev.reviewId
            ? { ...r, status: nextStatus }
            : r
        )
      );
    } catch (err) {
      alert("Failed to update review status.");
    }
  }

  async function handleDelete(rev) {
    if (!window.confirm("Permanently delete this customer review?")) return;
    try {
      await deleteReview(rev.reviewId || rev.id);
      setReviews((prev) => prev.filter((r) => r.id !== rev.id && r.reviewId !== rev.reviewId));
    } catch (err) {
      alert("Failed to delete review.");
    }
  }

  return (
    <OwnerLayout
      title="Product Review Moderation"
      subtitle="Inspect customer ratings and feedback (REV-10001)"
    >
      {loading ? (
        <p className="muted">Loading reviews...</p>
      ) : (
        <div className="card owner-table-card">
          {reviews.length === 0 ? (
            <p className="muted">No reviews submitted yet.</p>
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
                    <th>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => (
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
                            rev.status === "approved" ? "delivered" : "cancelled"
                          }`}
                        >
                          {rev.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleToggleStatus(rev)}
                            className="btn btn-secondary btn-sm"
                          >
                            {rev.status === "approved" ? "Hide" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleDelete(rev)}
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
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
