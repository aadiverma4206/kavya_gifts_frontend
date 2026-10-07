import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllUsersForOwner, toggleBlockUser } from "../../services/userService.js";
import { getOrdersByCustomer } from "../../services/orderService.js";
import { getPaymentsByCustomer } from "../../services/paymentService.js";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState("");

  // Inspect customer modal state
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectOrders, setInspectOrders] = useState([]);
  const [inspectPayments, setInspectPayments] = useState([]);
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [inspectTab, setInspectTab] = useState("profile"); // 'profile' | 'orders' | 'payments'

  function loadUsers() {
    setLoading(true);
    getAllUsersForOwner()
      .then((data) => setUsers(data.filter((u) => u.role !== "owner")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleToggleBlock(usr) {
    const nextBlocked = !usr.isBlocked;
    setFeedback("");
    try {
      await toggleBlockUser(usr.uid || usr.id, nextBlocked);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usr.id || u.uid === usr.uid ? { ...u, isBlocked: nextBlocked, status: nextBlocked ? "blocked" : "active" } : u
        )
      );
      setFeedback(
        `Customer ${usr.customerId || usr.fullName} is now ${
          nextBlocked ? "BLOCKED" : "ACTIVE"
        }.`
      );
      if (inspectUser && (inspectUser.uid === usr.uid || inspectUser.id === usr.id)) {
        setInspectUser((prev) => ({ ...prev, isBlocked: nextBlocked, status: nextBlocked ? "blocked" : "active" }));
      }
    } catch (err) {
      console.error("Block toggle error:", err);
      alert("Failed to toggle customer status.");
    }
  }

  async function handleOpenInspect(usr) {
    setInspectUser(usr);
    setInspectTab("profile");
    setLoadingInspect(true);
    try {
      const targetId = usr.customerId || usr.uid || usr.id;
      const [ords, pymts] = await Promise.all([
        getOrdersByCustomer(targetId),
        getPaymentsByCustomer(targetId),
      ]);
      setInspectOrders(ords);
      setInspectPayments(pymts);
    } catch (err) {
      console.warn("Error loading customer data:", err);
    } finally {
      setLoadingInspect(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    // Status filter
    if (statusFilter === "active" && (u.isBlocked || u.status === "blocked")) return false;
    if (statusFilter === "blocked" && !u.isBlocked && u.status !== "blocked") return false;

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (u.fullName || u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = (u.mobile || u.phone || "").toLowerCase();
    const id = (u.customerId || "").toLowerCase();
    return name.includes(term) || email.includes(term) || phone.includes(term) || id.includes(term);
  });

  return (
    <OwnerLayout
      title="Customer & User Management"
      subtitle="Inspect customer profiles, check order/payment histories, and manage access privileges"
    >
      {feedback && <div className="auth-alert success">{feedback}</div>}

      {/* Search & Filter Header Bar */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "560px" }}>
          <input
            type="text"
            placeholder="Search by customer name, ID (CUS-...), email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          >
            <option value="all">All Accounts ({users.length})</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </div>

        <button onClick={loadUsers} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading customer records...</p>
      ) : (
        <div className="card owner-table-card">
          {filteredUsers.length === 0 ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
              No customers match your search query.
            </p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Mobile</th>
                    <th>Account Status</th>
                    <th>Inspect Details</th>
                    <th>Security Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((usr) => (
                    <tr key={usr.id || usr.uid}>
                      <td><strong>{usr.customerId || "CUS-10001"}</strong></td>
                      <td>
                        <strong>{usr.fullName || usr.name || "Customer"}</strong>
                      </td>
                      <td>{usr.email}</td>
                      <td>{usr.mobile || "—"}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            (usr.status === "blocked" || usr.isBlocked) ? "cancelled" : "delivered"
                          }`}
                        >
                          {usr.status === "blocked" || usr.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenInspect(usr)}
                          className="btn btn-secondary btn-sm"
                        >
                          👁 Profile & Orders
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleBlock(usr)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            borderColor: usr.isBlocked ? "#166534" : "#991b1b",
                            color: usr.isBlocked ? "#166534" : "#991b1b",
                            fontWeight: 600,
                          }}
                        >
                          {usr.isBlocked ? "✓ Unblock" : "✕ Block"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Full Profile, Orders & Payments Inspection Modal */}
      {inspectUser && (
        <div className="modal-backdrop">
          <div className="card modal-card" style={{ maxWidth: "680px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Customer Dossier: {inspectUser.customerId || inspectUser.fullName}</h3>
              <button
                onClick={() => setInspectUser(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e5e7eb", margin: "16px 0 20px" }}>
              <button
                type="button"
                onClick={() => setInspectTab("profile")}
                className={`btn btn-sm ${inspectTab === "profile" ? "btn-primary" : "btn-secondary"}`}
              >
                👤 Profile Details
              </button>
              <button
                type="button"
                onClick={() => setInspectTab("orders")}
                className={`btn btn-sm ${inspectTab === "orders" ? "btn-primary" : "btn-secondary"}`}
              >
                🎁 Customer Orders ({inspectOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setInspectTab("payments")}
                className={`btn btn-sm ${inspectTab === "payments" ? "btn-primary" : "btn-secondary"}`}
              >
                💳 Payments ({inspectPayments.length})
              </button>
            </div>

            {/* TAB 1: PROFILE */}
            {inspectTab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Customer ID</span>
                    <strong>{inspectUser.customerId || "CUS-10001"}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Full Name</span>
                    <strong>{inspectUser.fullName || inspectUser.name || "Customer"}</strong>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Email Address</span>
                    <span>{inspectUser.email}</span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Contact Phone</span>
                    <span>{inspectUser.mobile || "—"}</span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Account Status</span>
                    <span className={`status-pill ${inspectUser.isBlocked ? "cancelled" : "delivered"}`}>
                      {inspectUser.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Role</span>
                    <span className="auth-tag" style={{ fontSize: "11px", padding: "2px 8px" }}>
                      {inspectUser.role || "customer"}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <span className="muted" style={{ fontSize: "12px", display: "block" }}>Saved Delivery Address</span>
                  <p style={{ margin: "4px 0", background: "#fdfaf6", padding: "10px", borderRadius: "8px", border: "1px solid #f0e6d2" }}>
                    {inspectUser.address || "No default address saved"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(inspectUser)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      borderColor: inspectUser.isBlocked ? "#166534" : "#991b1b",
                      color: inspectUser.isBlocked ? "#166534" : "#991b1b",
                      fontWeight: 600,
                    }}
                  >
                    {inspectUser.isBlocked ? "✓ Unblock Account" : "✕ Block Account"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS */}
            {inspectTab === "orders" && (
              <div>
                {loadingInspect ? (
                  <p className="muted">Loading orders...</p>
                ) : inspectOrders.length === 0 ? (
                  <p className="muted">This customer has not placed any orders yet.</p>
                ) : (
                  <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {inspectOrders.map((ord) => (
                      <div key={ord.orderId} style={{ padding: "12px", background: "#fdfaf6", borderRadius: "8px", border: "1px solid #eee", fontSize: "13.5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <strong>{ord.orderId}</strong>
                          <span className={`status-pill ${ord.orderStatus || "pending"}`}>{ord.orderStatus}</span>
                        </div>
                        <div className="muted">
                          {ord.items?.map((it) => `${it.product_name || it.productName} (×${it.quantity})`).join(", ")}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontWeight: 600 }}>
                          <span>Total: ₹{(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}</span>
                          <span style={{ color: ord.paymentStatus === "paid" ? "#166534" : "#92400e" }}>
                            Payment: {ord.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PAYMENTS */}
            {inspectTab === "payments" && (
              <div>
                {loadingInspect ? (
                  <p className="muted">Loading payments...</p>
                ) : inspectPayments.length === 0 ? (
                  <p className="muted">No payment transactions recorded for this customer.</p>
                ) : (
                  <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {inspectPayments.map((p) => (
                      <div key={p.paymentId} style={{ padding: "12px", background: "#fdfaf6", borderRadius: "8px", border: "1px solid #eee", fontSize: "13.5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <strong>{p.paymentId}</strong>
                          <span className={`status-pill ${p.status === "paid" ? "delivered" : "placed"}`}>{p.status}</span>
                        </div>
                        <div className="muted">
                          Linked Order: <strong>{p.orderId}</strong> • Method: {p.method} ({p.provider})
                        </div>
                        <div style={{ marginTop: "4px", fontWeight: 600, color: "var(--color-primary)" }}>
                          Amount: ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setInspectUser(null)}
              className="btn btn-primary btn-block"
              style={{ marginTop: "20px" }}
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
