import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { getAllPaymentsForOwner } from "../../services/paymentService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { notify } from "../../utils/notify";
import "./PaymentHistory.css";

export default function PaymentHistory() {
  useDocumentTitle("Payment Audit Ledger - Owner Portal");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);

  function loadPayments() {
    setLoading(true);
    getAllPaymentsForOwner()
      .then((data) => setPayments(data || []))
      .catch((err) => {
        console.error("Error loading payments:", err);
        notify.error("Could not load payment audit logs.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const metrics = useMemo(() => {
    let collected = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    payments.forEach((p) => {
      const st = (p.status || p.paymentStatus || "").toLowerCase();
      const amt = Number(p.amount) || 0;
      if (st === "completed" || st === "paid") {
        collected += amt;
        completedCount++;
      } else if (st === "pending") {
        pendingCount++;
      } else if (st === "failed") {
        failedCount++;
      }
    });

    const aov = completedCount > 0 ? Math.round(collected / completedCount) : 0;
    return { collected, completedCount, pendingCount, failedCount, aov };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all") {
        const st = (p.status || p.paymentStatus || "").toLowerCase();
        if (statusFilter === "paid") {
          if (st !== "paid" && st !== "completed") return false;
        } else if (st !== statusFilter) {
          return false;
        }
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const pid = (p.paymentId || "").toLowerCase();
      const oid = (p.orderId || "").toLowerCase();
      const cid = (p.customerId || "").toLowerCase();
      const method = (p.method || "").toLowerCase();
      const provider = (p.provider || "").toLowerCase();

      return pid.includes(term) || oid.includes(term) || cid.includes(term) || method.includes(term) || provider.includes(term);
    });
  }, [payments, statusFilter, searchTerm]);

  function getMethodChip(method = "") {
    const m = method.toLowerCase();
    if (m.includes("upi")) return <span className="payment-method-chip method-upi">⚡ UPI</span>;
    if (m.includes("card") || m.includes("credit") || m.includes("debit")) {
      return <span className="payment-method-chip method-card">💳 Card</span>;
    }
    if (m.includes("net") || m.includes("bank")) {
      return <span className="payment-method-chip method-netbanking">🏦 NetBanking</span>;
    }
    if (m.includes("cod") || m.includes("delivery")) {
      return <span className="payment-method-chip method-cod">💵 COD</span>;
    }
    return <span className="payment-method-chip">{method || "Direct"}</span>;
  }

  return (
    <OwnerLayout
      title="Payment Transactions & Settlement Ledger"
      subtitle="Comprehensive audit trail of customer authorizations, gateway verifications, and collections"
      actionButton={
        <button onClick={loadPayments} className="btn btn-secondary btn-sm">
          🔄 Refresh Ledger
        </button>
      }
    >
      <div className="payment-mgmt-container">
        {/* Metric Cards */}
        <div className="payment-stats-grid">
          <div className="payment-stat-card">
            <div className="payment-stat-icon" style={{ background: "#ecfdf5", color: "#166534" }}>₹</div>
            <div className="payment-stat-info">
              <h4>Total Revenue Collected</h4>
              <p className="payment-stat-val" style={{ color: "var(--color-primary, #7a1f2b)" }}>
                {formatCurrency(metrics.collected)}
              </p>
            </div>
          </div>

          <div className="payment-stat-card">
            <div className="payment-stat-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>✓</div>
            <div className="payment-stat-info">
              <h4>Settled Transactions</h4>
              <p className="payment-stat-val" style={{ color: "#1d4ed8" }}>{metrics.completedCount}</p>
            </div>
          </div>

          <div className="payment-stat-card">
            <div className="payment-stat-icon" style={{ background: "#fffbeb", color: "#b45309" }}>⏳</div>
            <div className="payment-stat-info">
              <h4>Pending Verifications</h4>
              <p className="payment-stat-val" style={{ color: "#b45309" }}>{metrics.pendingCount}</p>
            </div>
          </div>

          <div className="payment-stat-card">
            <div className="payment-stat-icon" style={{ background: "#fdf2f8", color: "#9d174d" }}>📊</div>
            <div className="payment-stat-info">
              <h4>Average Hamper Value</h4>
              <p className="payment-stat-val" style={{ color: "#9d174d" }}>
                {formatCurrency(metrics.aov)}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
            <input
              type="text"
              placeholder="🔍 Search by Payment ID (PAY-...), Order ID, or Method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "10px 16px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "14px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "13px" }}
            >
              <option value="all">All Transactions ({payments.length})</option>
              <option value="paid">Paid / Settled</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <span className="muted" style={{ fontSize: "13px" }}>
            Showing {filteredPayments.length} transactions
          </span>
        </div>

        {/* Table Card */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading transaction records...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            {filteredPayments.length === 0 ? (
              <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                No payment transactions found.
              </p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Transaction ID & Time</th>
                      <th>Linked Order</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Gateway Status</th>
                      <th style={{ textAlign: "right" }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const isSettled = p.status === "completed" || p.status === "paid" || p.paymentStatus === "paid";
                      return (
                        <tr key={p.id || p.paymentId}>
                          <td>
                            <strong style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.paymentId || p.id}</strong>
                            <span className="muted" style={{ display: "block", fontSize: "11px", marginTop: "2px" }}>
                              {formatDate(p.createdAt || p.timestamp)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--color-primary, #7a1f2b)" }}>
                              {p.orderId || "—"}
                            </span>
                          </td>
                          <td>{getMethodChip(p.method || p.paymentMethod || "UPI")}</td>
                          <td>
                            <strong style={{ fontSize: "14px", color: isSettled ? "#166534" : "#991b1b" }}>
                              {formatCurrency(p.amount || 0)}
                            </strong>
                          </td>
                          <td>
                            <span className={`status-pill ${isSettled ? "delivered" : p.status === "pending" ? "placed" : "cancelled"}`}>
                              {p.status || p.paymentStatus || "pending"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPayment(p)}
                              className="btn btn-secondary btn-sm"
                            >
                              Verify
                            </button>
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

        {/* Verification Modal */}
        {selectedPayment && (
          <div className="modal-backdrop" onClick={() => setSelectedPayment(null)}>
            <div className="modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "var(--color-primary, #7a1f2b)" }}>
                  Transaction Verification
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              <div className="payment-receipt-box">
                <div className="receipt-field-grid">
                  <div className="receipt-field-item">
                    <label>Payment Reference</label>
                    <strong>{selectedPayment.paymentId || selectedPayment.id}</strong>
                  </div>
                  <div className="receipt-field-item">
                    <label>Order Reference</label>
                    <strong>{selectedPayment.orderId}</strong>
                  </div>
                  <div className="receipt-field-item">
                    <label>Payment Amount</label>
                    <strong style={{ fontSize: "18px", color: "var(--color-primary)" }}>
                      {formatCurrency(selectedPayment.amount || 0)}
                    </strong>
                  </div>
                  <div className="receipt-field-item">
                    <label>Payment Method</label>
                    <div>{getMethodChip(selectedPayment.method || selectedPayment.paymentMethod)}</div>
                  </div>
                  <div className="receipt-field-item">
                    <label>Gateway Provider</label>
                    <strong>{selectedPayment.provider || "Razorpay Direct / Stripe"}</strong>
                  </div>
                  <div className="receipt-field-item">
                    <label>Timestamp</label>
                    <strong>{formatDate(selectedPayment.createdAt || selectedPayment.timestamp)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="btn btn-secondary"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
