import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllPaymentsForOwner } from "../../services/paymentService";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPaymentsForOwner()
      .then((data) => setPayments(data))
      .finally(() => setLoading(false));
  }, []);

  const totalCollected = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <OwnerLayout
      title="Payment Transaction History"
      subtitle="Audit log of customer payment authorizations and collections (PAY-10001)"
      actionButton={
        <div style={{ textAlign: "right" }}>
          <span className="muted" style={{ fontSize: "12px", display: "block" }}>Total Authorized:</span>
          <strong style={{ fontSize: "20px", color: "var(--color-primary)" }}>
            ₹{totalCollected.toLocaleString("en-IN")}
          </strong>
        </div>
      }
    >
      {loading ? (
        <p className="muted">Loading payment audit log...</p>
      ) : (
        <div className="card owner-table-card">
          {payments.length === 0 ? (
            <p className="muted">No payments recorded yet.</p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Linked Order</th>
                    <th>Customer ID</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.paymentId}</strong></td>
                      <td>
                        <strong style={{ color: "var(--color-primary)" }}>{p.orderId}</strong>
                      </td>
                      <td>{p.customerId || "Guest"}</td>
                      <td>{p.method}</td>
                      <td><strong>₹{p.amount?.toLocaleString("en-IN")}</strong></td>
                      <td>
                        <span className={`status-pill ${p.status === "completed" ? "delivered" : "cancelled"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: "12.5px" }}>
                        {p.createdAt?.toDate
                          ? p.createdAt.toDate().toLocaleString("en-IN")
                          : "Recently logged"}
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
