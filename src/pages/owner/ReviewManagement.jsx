import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  getAllReviewsForOwner,
  updateReviewStatus,
  deleteReview,
} from "../../services/reviewService.js";
import { notify } from "../../utils/notify";
import { formatDate } from "../../utils/formatters";
import "./ReviewManagement.css";

export default function ReviewManagement() {
  useDocumentTitle("Customer Reviews Moderation - Owner Portal");
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  function loadReviews() {
    setLoading(true);
    getAllReviewsForOwner()
      .then((data) => setReviews(data || []))
      .catch((err) => {
        console.error("Error loading reviews:", err);
        notify.error("Could not load reviews.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReviews();
  }, []);

  const stats = useMemo(() => {
    const total = reviews.length;
    let approved = 0;
    let pending = 0;
    let totalScore = 0;

    reviews.forEach((r) => {
      const st = r.status || "approved";
      if (st === "approved") approved++;
      if (st === "pending") pending++;
      totalScore += Number(r.rating) || 5;
    });

    const avg = total > 0 ? (totalScore / total).toFixed(1) : "5.0";
    return { total, approved, pending, avg };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== "all" && (r.status || "approved") !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const comment = (r.comment || "").toLowerCase();
      const customer = (r.customerName || r.userName || "").toLowerCase();
      const product = (r.productName || "").toLowerCase();
      return comment.includes(q) || customer.includes(q) || product.includes(q);
    });
  }, [reviews, statusFilter, searchTerm]);

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
      notify.success(`Review status set to "${newStatus}".`);
    } catch (err) {
      notify.error("Failed to update review status: " + err.message);
    }
  }

  async function handleDelete(rev) {
    if (!window.confirm("Permanently delete this customer review?")) return;
    try {
      await deleteReview(rev.reviewId || rev.id);
      setReviews((prev) => prev.filter((r) => r.id !== rev.id && r.reviewId !== rev.reviewId));
      notify.success("Review deleted successfully.");
    } catch (err) {
      notify.error("Failed to delete review: " + err.message);
    }
  }

  function renderStars(rating = 5) {
    const count = Math.round(Number(rating) || 5);
    return "★".repeat(Math.max(1, Math.min(5, count))) + "☆".repeat(Math.max(0, 5 - count));
  }

  return (
    <OwnerLayout
      title="Product Review & Feedback Moderation"
      subtitle="Inspect customer unboxing testimonials, approve verified reviews, or hide inappropriate feedback"
      actionButton={
        <button onClick={loadReviews} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      }
    >
      <div className="review-mgmt-container">
        {/* Analytics Stats */}
        <div className="review-stats-grid">
          <div className="review-stat-card">
            <div className="review-stat-icon" style={{ background: "#fef3c7", color: "#b45309" }}>⭐</div>
            <div className="review-stat-info">
              <h4>Average Rating</h4>
              <p className="review-stat-val" style={{ color: "#b45309" }}>{stats.avg} / 5.0</p>
            </div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-icon" style={{ background: "#ecfdf5", color: "#166534" }}>💬</div>
            <div className="review-stat-info">
              <h4>Total Customer Reviews</h4>
              <p className="review-stat-val" style={{ color: "var(--color-primary, #7a1f2b)" }}>{stats.total}</p>
            </div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>✓</div>
            <div className="review-stat-info">
              <h4>Approved & Visible</h4>
              <p className="review-stat-val" style={{ color: "#1d4ed8" }}>{stats.approved}</p>
            </div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-icon" style={{ background: "#fff7ed", color: "#c2410c" }}>⏳</div>
            <div className="review-stat-info">
              <h4>Pending Moderation</h4>
              <p className="review-stat-val" style={{ color: "#c2410c" }}>{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
            <input
              type="text"
              placeholder="🔍 Search comments, hamper name, or reviewer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "10px 16px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "14px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "13px" }}
            >
              <option value="all">All Reviews ({reviews.length})</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <span className="muted" style={{ fontSize: "13px" }}>
            Showing {filteredReviews.length} reviews
          </span>
        </div>

        {/* Reviews Table */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading reviews...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            {filteredReviews.length === 0 ? (
              <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                No customer reviews match your criteria.
              </p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Hamper & Date</th>
                      <th>Patron</th>
                      <th>Rating</th>
                      <th>Customer Feedback</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map((r) => {
                      const st = r.status || "approved";
                      return (
                        <tr key={r.id || r.reviewId}>
                          <td>
                            <strong>{r.productName || `Product #${r.productId}`}</strong>
                            <span className="muted" style={{ display: "block", fontSize: "11px", marginTop: "2px" }}>
                              {formatDate(r.createdAt || r.date)}
                            </span>
                          </td>
                          <td>
                            <span>{r.customerName || r.userName || "Verified Buyer"}</span>
                          </td>
                          <td>
                            <span className="star-rating-display">{renderStars(r.rating)}</span>
                            <span className="muted" style={{ fontSize: "12px", marginLeft: "4px" }}>
                              ({r.rating || 5}/5)
                            </span>
                          </td>
                          <td>
                            <div className="review-comment-cell">
                              <blockquote>"{r.comment || r.review || "Wonderful gift packaging!"}"</blockquote>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${st === "approved" ? "delivered" : st === "pending" ? "placed" : "cancelled"}`}>
                              {st}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              {st !== "approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(r, "approved")}
                                  className="review-btn-approve"
                                >
                                  ✓ Approve
                                </button>
                              )}
                              {st !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(r, "rejected")}
                                  className="review-btn-reject"
                                >
                                  ✕ Reject
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(r)}
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
            )}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
