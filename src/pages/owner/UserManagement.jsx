import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { getAllUsersForOwner, toggleBlockUser } from "../../services/userService.js";
import { getOrdersByCustomer } from "../../services/orderService.js";
import { getPaymentsByCustomer } from "../../services/paymentService.js";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { notify } from "../../utils/notify";
import "./UserManagement.css";

export default function UserManagement() {
  useDocumentTitle("Customer Directory - Owner Portal");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inspect customer modal state
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectOrders, setInspectOrders] = useState([]);
  const [inspectPayments, setInspectPayments] = useState([]);
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [inspectTab, setInspectTab] = useState("profile"); // 'profile' | 'orders' | 'payments'

  function loadUsers() {
    setLoading(true);
    getAllUsersForOwner()
      .then((data) => setUsers((data || []).filter((u) => u.role !== "owner")))
      .catch((err) => {
        console.error("Error loading users:", err);
        notify.error("Could not load customer profiles.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const blocked = users.filter((u) => u.isBlocked || u.status === "blocked").length;
    const active = total - blocked;
    return { total, active, blocked };
  }, [users]);

  async function handleToggleBlock(usr) {
    const nextBlocked = !usr.isBlocked;
    try {
      await toggleBlockUser(usr.uid || usr.id, nextBlocked);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usr.id || u.uid === usr.uid
            ? { ...u, isBlocked: nextBlocked, status: nextBlocked ? "blocked" : "active" }
            : u
        )
      );
      notify.info(
        `Customer ${usr.customerId || usr.fullName || "Account"} is now ${
          nextBlocked ? "BLOCKED" : "ACTIVE"
        }.`
      );
      if (inspectUser && (inspectUser.uid === usr.uid || inspectUser.id === usr.id)) {
        setInspectUser((prev) => ({
          ...prev,
          isBlocked: nextBlocked,
          status: nextBlocked ? "blocked" : "active",
        }));
      }
    } catch (err) {
      console.error("Block toggle error:", err);
      notify.error("Failed to toggle customer status.");
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
      setInspectOrders(ords || []);
      setInspectPayments(pymts || []);
    } catch (err) {
      console.warn("Error loading customer data:", err);
    } finally {
      setLoadingInspect(false);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === "active" && (u.isBlocked || u.status === "blocked")) return false;
      if (statusFilter === "blocked" && !u.isBlocked && u.status !== "blocked") return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.mobile || u.phone || "").toLowerCase();
      const id = (u.customerId || "").toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || id.includes(term);
    });
  }, [users, statusFilter, searchTerm]);

  return (
    <OwnerLayout
      title="Customer Directory & Patron Accounts"
      subtitle="Inspect customer profiles, order histories, payment ledgers, and manage store access"
      actionButton={
        <button onClick={loadUsers} className="btn btn-secondary btn-sm">
          🔄 Refresh Patrons
        </button>
      }
    >
      <div className="user-mgmt-container">
        {/* Metric Stats */}
        <div className="user-stats-grid">
          <div className="user-stat-card">
            <div className="user-stat-icon" style={{ background: "#fdf2f8", color: "#9d174d" }}>👥</div>
            <div className="user-stat-info">
              <h4>Registered Patrons</h4>
              <p className="user-stat-val" style={{ color: "var(--color-primary, #7a1f2b)" }}>{stats.total}</p>
            </div>
          </div>
          <div className="user-stat-card">
            <div className="user-stat-icon" style={{ background: "#ecfdf5", color: "#166534" }}>✨</div>
            <div className="user-stat-info">
              <h4>Active Accounts</h4>
              <p className="user-stat-val" style={{ color: "#166534" }}>{stats.active}</p>
            </div>
          </div>
          <div className="user-stat-card">
            <div className="user-stat-icon" style={{ background: "#fef2f2", color: "#991b1b" }}>🛡️</div>
            <div className="user-stat-info">
              <h4>Restricted / Blocked</h4>
              <p className="user-stat-val" style={{ color: "#991b1b" }}>{stats.blocked}</p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
            <input
              type="text"
              placeholder="🔍 Search patrons by name, email, phone, or customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "10px 16px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "14px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(122, 31, 43, 0.2)", fontSize: "13px" }}
            >
              <option value="all">All Patrons ({users.length})</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>

          <span className="muted" style={{ fontSize: "13px" }}>
            Showing {filteredUsers.length} patron profiles
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading patron directory...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            {filteredUsers.length === 0 ? (
              <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                No patrons found matching your search.
              </p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Patron Profile</th>
                      <th>Contact Details</th>
                      <th>Customer ID</th>
                      <th>Member Since</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isBlk = u.isBlocked || u.status === "blocked";
                      const name = u.fullName || u.name || "Customer";
                      const initial = name.charAt(0).toUpperCase();
                      return (
                        <tr key={u.id || u.uid}>
                          <td>
                            <div className="user-name-group">
                              <span className="user-avatar-badge">{initial}</span>
                              <div>
                                <strong>{name}</strong>
                                {u.city && <span className="muted" style={{ display: "block", fontSize: "12px" }}>{u.city}</span>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{u.email}</div>
                            {u.mobile && (
                              <span className="muted" style={{ fontSize: "12px" }}>📞 {u.mobile}</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                              {u.customerId || u.uid?.slice(0, 8)}
                            </span>
                          </td>
                          <td>
                            <span className="muted" style={{ fontSize: "13px" }}>
                              {formatDate(u.createdAt)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${isBlk ? "cancelled" : "delivered"}`}>
                              {isBlk ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenInspect(u)}
                                className="btn btn-secondary btn-sm"
                              >
                                View 360°
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleBlock(u)}
                                className="btn btn-secondary btn-sm"
                                style={{ color: isBlk ? "#166534" : "#991b1b" }}
                              >
                                {isBlk ? "Unblock" : "Block"}
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

        {/* 360 Inspect Modal */}
        {inspectUser && (
          <div className="modal-backdrop" onClick={() => setInspectUser(null)}>
            <div className="modal-card" style={{ maxWidth: "640px", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--color-primary, #7a1f2b)" }}>
                    Patron Profile: {inspectUser.fullName || inspectUser.name || "Customer"}
                  </h3>
                  <span className="muted" style={{ fontSize: "12.5px" }}>
                    ID: {inspectUser.customerId || inspectUser.uid}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="user-tab-nav">
                <button
                  type="button"
                  className={`user-tab-item ${inspectTab === "profile" ? "active" : ""}`}
                  onClick={() => setInspectTab("profile")}
                >
                  Profile Overview
                </button>
                <button
                  type="button"
                  className={`user-tab-item ${inspectTab === "orders" ? "active" : ""}`}
                  onClick={() => setInspectTab("orders")}
                >
                  Orders ({inspectOrders.length})
                </button>
                <button
                  type="button"
                  className={`user-tab-item ${inspectTab === "payments" ? "active" : ""}`}
                  onClick={() => setInspectTab("payments")}
                >
                  Payments ({inspectPayments.length})
                </button>
              </div>

              {/* Tab Contents */}
              {inspectTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px" }}>
                  <div style={{ background: "#fdfaf6", padding: "16px", borderRadius: "10px", border: "1px solid #f0e6d6" }}>
                    <div><strong>Full Name:</strong> {inspectUser.fullName || inspectUser.name}</div>
                    <div style={{ marginTop: "6px" }}><strong>Email Address:</strong> {inspectUser.email}</div>
                    <div style={{ marginTop: "6px" }}><strong>Contact Phone:</strong> {inspectUser.mobile || inspectUser.phone || "Not recorded"}</div>
                    <div style={{ marginTop: "6px" }}><strong>Delivery Address:</strong> {inspectUser.address || "No saved address"}</div>
                    <div style={{ marginTop: "6px" }}><strong>City / Pincode:</strong> {inspectUser.city || "—"} {inspectUser.pincode ? `(${inspectUser.pincode})` : ""}</div>
                    <div style={{ marginTop: "6px" }}><strong>Account Status:</strong> <span className={`status-pill ${inspectUser.isBlocked ? "cancelled" : "delivered"}`}>{inspectUser.isBlocked ? "Blocked" : "Active"}</span></div>
                  </div>
                </div>
              )}

              {inspectTab === "orders" && (
                <div>
                  {loadingInspect ? (
                    <p className="muted">Loading customer bookings...</p>
                  ) : inspectOrders.length === 0 ? (
                    <p className="muted">No orders found for this patron.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {inspectOrders.map((ord) => (
                        <div key={ord.id} style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <div>
                            <strong>{ord.orderId}</strong>
                            <span className="muted" style={{ display: "block" }}>{ord.items?.length || 0} items</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong>{formatCurrency(ord.totalAmount || 0)}</strong>
                            <span className={`status-pill ${ord.orderStatus || "placed"}`} style={{ display: "block", marginTop: "2px" }}>
                              {ord.orderStatus || "placed"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inspectTab === "payments" && (
                <div>
                  {loadingInspect ? (
                    <p className="muted">Loading transaction records...</p>
                  ) : inspectPayments.length === 0 ? (
                    <p className="muted">No payment records found.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {inspectPayments.map((p) => (
                        <div key={p.id} style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <div>
                            <strong>{p.paymentId || p.id}</strong>
                            <span className="muted" style={{ display: "block" }}>{p.method || "Direct"}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong>{formatCurrency(p.amount || 0)}</strong>
                            <span className={`status-pill ${p.status === "paid" ? "delivered" : "placed"}`} style={{ display: "block", marginTop: "2px" }}>
                              {p.status || "pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
