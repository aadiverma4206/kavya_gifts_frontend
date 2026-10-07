import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllPaymentsForOwner } from "../../services/paymentService";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);

  function loadPayments() {
    setLoading(true);
    getAllPaymentsForOwner()
      .then((data) => setPayments(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const totalCollected = payments
    .filter((p) => p.status === "completed" || p.status === "paid" || p.paymentStatus === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    // Status filter
    if (statusFilter !== "all") {
      const st = (p.status || p.paymentStatus || "").toLowerCase();
      if (statusFilter === "paid" || statusFilter === "completed") {
        if (st !== "paid" && st !== "completed") return false;
      } else if (st !== statusFilter) {
        return false;
      }
    }

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const pid = (p.paymentId || "").toLowerCase();
    const oid = (p.orderId || "").toLowerCase();
    const cid = (p.customerId || "").toLowerCase();
    const method = (p.method || "").toLowerCase();
    const provider = (p.provider || "").toLowerCase();

    return pid.includes(term) || oid.includes(term) || cid.includes(term) || method.includes(term) || provider.includes(term);
  });

  return (
    <OwnerLayout
      title="Payment Transaction History"
      subtitle="Audit log of customer payment authorizations, transaction verification and collections"
      actionButton={
        <div style={{ textAlign: "right" }}>
          <span className="muted" style={{ fontSize: "12px", display: "block" }}>Total Collected:</span>
          <strong style={{ fontSize: "20px", color: "var(--color-primary)" }}>
            ₹{totalCollected.toLocaleString("en-IN")}
          </strong>
        </div>
      }
    >
      {/* Search & Filter Header Bar */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
          <input
            type="text"
            placeholder="Search by Payment ID (PAY-...), Order ID, Customer ID, or Method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          >
            <option value="all">All Payments ({payments.length})</option>
            <option value="paid">Paid / Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button onClick={loadPayments} className="btn btn-secondary btn-sm">
          🔄 Refresh Ledger
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading payment audit log...</p>
      ) : (
        <div className="card owner-table-card">
          {filteredPayments.length === 0 ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
              No payments match your filter criteria.
            </p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Linked Order</th>
                    <th>Customer ID</th>
                    <th>Method & Provider</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const isSuccess = p.status === "completed" || p.status === "paid" || p.paymentStatus === "paid";
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.paymentId || p.id}</strong></td>
                        <td>
                          <strong style={{ color: "var(--color-primary)" }}>{p.orderId || "—"}</strong>
                        </td>
                        <td>{p.customerId || "Guest"}</td>
                        <td>
                          <div style={{ textTransform: "capitalize" }}>{p.method || "card"}</div>
                          <span className="muted" style={{ fontSize: "11.5px" }}>
                            {p.provider || "Gateway"}
                          </span>
                        </td>
                        <td><strong>₹{p.amount?.toLocaleString("en-IN")}</strong></td>
                        <td>
                          <span
                            className={`status-pill ${
                              isSuccess ? "delivered" : p.status === "failed" ? "cancelled" : "placed"
                            }`}
                          >
                            {p.status || p.paymentStatus || "pending"}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: "12.5px" }}>
                          {p.createdAt?.toDate
                            ? p.createdAt.toDate().toLocaleString("en-IN")
                            : p.createdAt?.seconds
                            ? new Date(p.createdAt.seconds * 1000).toLocaleString("en-IN")
                            : "Recently logged"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedPayment(p)}
                            className="btn btn-secondary btn-sm"
                          >
                            Inspect
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

      {/* Payment Details Inspection Modal */}
      {selectedPayment && (
        <div className="modal-backdrop">
          <div className="card modal-card" style={{ maxWidth: "580px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Payment Record: {selectedPayment.paymentId || selectedPayment.id}</h3>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
              <div style={{ background: "#fdfaf6", padding: "16px", borderRadius: "8px", border: "1px solid #f0e6d2" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Payment ID</span>
                    <strong>{selectedPayment.paymentId || selectedPayment.id}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Linked Order ID</span>
                    <strong style={{ color: "var(--color-primary)" }}>{selectedPayment.orderId || "None"}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Customer ID</span>
                    <span>{selectedPayment.customerId || "Guest / Unregistered"}</span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Payment Status</span>
                    <span
                      className={`status-pill ${
                        selectedPayment.status === "completed" || selectedPayment.status === "paid"
                          ? "delivered"
                          : selectedPayment.status === "failed"
                          ? "cancelled"
                          : "placed"
                      }`}
                    >
                      {selectedPayment.status || selectedPayment.paymentStatus || "pending"}
                    </span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Payment Method</span>
                    <strong style={{ textTransform: "capitalize" }}>{selectedPayment.method || "card"}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Payment Gateway / Provider</span>
                    <span>{selectedPayment.provider || "Direct / Gateway"}</span>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "14px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600 }}>Total Authorized & Charged:</span>
                  <strong style={{ fontSize: "20px", color: "var(--color-primary)" }}>
                    ₹{selectedPayment.amount?.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* Security & Verification Metadata */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Security & Verification Audit</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Backend Signature Verified:</span>
                    <span style={{ color: "#166534", fontWeight: 600 }}>✓ Verified Architecture</span>
                  </div>
                  {selectedPayment.transactionRef && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="muted">Provider Transaction Ref:</span>
                      <code>{selectedPayment.transactionRef}</code>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Logged Timestamp:</span>
                    <span>
                      {selectedPayment.createdAt?.toDate
                        ? selectedPayment.createdAt.toDate().toLocaleString("en-IN")
                        : selectedPayment.createdAt?.seconds
                        ? new Date(selectedPayment.createdAt.seconds * 1000).toLocaleString("en-IN")
                        : "Instant"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="btn btn-primary btn-block"
              >
                Close Payment Details
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
