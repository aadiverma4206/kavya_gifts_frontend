import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllOrdersForOwner, updateOrderStatus } from "../../services/orderService";

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const ALLOWED_TRANSITIONS = {
    placed: ["confirmed", "cancelled"],
    pending: ["confirmed", "cancelled"],
    confirmed: ["packed", "cancelled"],
    packed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  function loadOrders() {
    setLoading(true);
    getAllOrdersForOwner()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleStatusChange(orderId, currentStatus, nextStatus) {
    setStatusMsg("");
    const curr = (currentStatus || "placed").toLowerCase();
    const next = nextStatus.toLowerCase();

    if (curr === next) return;

    // Terminal states cannot transition
    if (curr === "delivered" || curr === "cancelled") {
      alert(`Cannot modify order ${orderId} because it is already marked as "${curr}".`);
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[curr] || ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(next)) {
      const confirmOverride = window.confirm(
        `Normal workflow from "${curr}" expects: ${allowed.join(" or ")}.\n\nDo you want to force status transition to "${next}"?`
      );
      if (!confirmOverride) return;
    }

    try {
      await updateOrderStatus(orderId, { orderStatus: next });
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, orderStatus: next } : o))
      );
      setStatusMsg(`Order ${orderId} fulfillment status moved to "${next}".`);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, orderStatus: next }));
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  }

  async function handlePaymentStatusChange(orderId, nextPaymentStatus) {
    try {
      await updateOrderStatus(orderId, { paymentStatus: nextPaymentStatus });
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, paymentStatus: nextPaymentStatus } : o))
      );
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, paymentStatus: nextPaymentStatus }));
      }
    } catch (err) {
      alert("Failed to update payment status.");
    }
  }

  const filteredOrders = orders.filter((ord) => {
    // Status filter
    if (statusFilter !== "all") {
      const ordSt = (ord.orderStatus || "placed").toLowerCase();
      if (statusFilter === "pending" || statusFilter === "placed") {
        if (ordSt !== "pending" && ordSt !== "placed") return false;
      } else if (ordSt !== statusFilter) {
        return false;
      }
    }

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const oid = (ord.orderId || "").toLowerCase();
    const cname = (ord.customerSnapshot?.name || ord.customer?.name || "").toLowerCase();
    const cphone = (ord.customerSnapshot?.mobile || ord.customer?.phone || "").toLowerCase();
    const cid = (ord.customerId || "").toLowerCase();

    return oid.includes(term) || cname.includes(term) || cphone.includes(term) || cid.includes(term);
  });

  return (
    <OwnerLayout
      title="Cart & Order Management"
      subtitle="Track customer bookings, artisan gift wrap messages, and delivery milestones"
    >
      {statusMsg && <div className="auth-alert success">{statusMsg}</div>}

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "580px" }}>
          <input
            type="text"
            placeholder="Search by Order ID (ORD-...), Customer, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="placed">Placed / Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button onClick={loadOrders} className="btn btn-secondary btn-sm">
          🔄 Refresh Orders
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading orders...</p>
      ) : (
        <div className="card owner-table-card">
          {filteredOrders.length === 0 ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
              No orders found matching the filter criteria.
            </p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items Summary</th>
                    <th>Gift Wrapping</th>
                    <th>Total</th>
                    <th>Workflow Status</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => {
                    const currSt = ord.orderStatus || "placed";
                    return (
                      <tr key={ord.id}>
                        <td><strong>{ord.orderId}</strong></td>
                        <td>
                          <div>{ord.customerSnapshot?.name || ord.customer?.name || "Customer"}</div>
                          <span className="muted" style={{ fontSize: "12px" }}>
                            📞 {ord.customerSnapshot?.mobile || ord.customer?.phone || "—"}
                          </span>
                        </td>
                        <td>
                          {ord.items?.length} items:{" "}
                          <span className="muted">
                            {ord.items?.map((i) => `${i.product_name || i.productName} (×${i.quantity})`).join(", ")}
                          </span>
                        </td>
                        <td>
                          {ord.giftWrap?.enabled || ord.giftWrappingSelected ? (
                            <div>
                              <span className="wrap-tag-sm">🎁 {ord.giftWrap?.optionName || "Artisan Wrap"}</span>
                              {(ord.giftWrap?.message || ord.giftWrapMessage) && (
                                <p style={{ fontStyle: "italic", fontSize: "11px", margin: "2px 0 0", color: "#92400e" }}>
                                  "{(ord.giftWrap?.message || ord.giftWrapMessage).substring(0, 30)}..."
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="muted">None</span>
                          )}
                        </td>
                        <td><strong>₹{(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}</strong></td>
                        <td>
                          <select
                            value={currSt}
                            onChange={(e) => handleStatusChange(ord.orderId, currSt, e.target.value)}
                            disabled={currSt === "delivered" || currSt === "cancelled"}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              borderColor: currSt === "delivered" ? "#166534" : currSt === "cancelled" ? "#991b1b" : "#d97706",
                            }}
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={ord.paymentStatus || "pending"}
                            onChange={(e) => handlePaymentStatusChange(ord.orderId, e.target.value)}
                            style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "13px" }}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedOrder(ord)}
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

      {/* Order Inspection Modal */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="card modal-card" style={{ maxWidth: "620px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Order Details: {selectedOrder.orderId}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fdfaf6", padding: "14px", borderRadius: "8px" }}>
                <h4>Customer & Destination</h4>
                <p style={{ margin: "4px 0" }}>
                  Name: <strong>{selectedOrder.customerSnapshot?.name || selectedOrder.customer?.name}</strong>
                </p>
                <p style={{ margin: "4px 0" }}>
                  Mobile: <strong>{selectedOrder.customerSnapshot?.mobile || selectedOrder.customer?.phone}</strong>
                </p>
                <p style={{ margin: "4px 0" }}>
                  Delivery Address: {selectedOrder.deliveryAddress || selectedOrder.customerSnapshot?.address || selectedOrder.customer?.address}
                </p>
                <p style={{ margin: "4px 0" }}>
                  Customer ID: {selectedOrder.customerId || "Guest"}
                </p>
              </div>

              {selectedOrder.giftWrap?.enabled && (
                <div style={{ background: "#fff8eb", padding: "14px", borderRadius: "8px", border: "1px dashed #d9a441" }}>
                  <h4>🎁 Artisan Gift Wrap Instructions</h4>
                  <p style={{ margin: "4px 0" }}>Style: <strong>{selectedOrder.giftWrap.optionName}</strong></p>
                  {selectedOrder.giftWrap.recipientName && (
                    <p style={{ margin: "4px 0" }}>For: <strong>{selectedOrder.giftWrap.recipientName}</strong></p>
                  )}
                  {selectedOrder.giftWrap.message && (
                    <p style={{ margin: "6px 0 0", fontStyle: "italic", color: "#78350f" }}>
                      Handwritten Note: "{selectedOrder.giftWrap.message}"
                    </p>
                  )}
                </div>
              )}

              <div>
                <h4>Packed Items</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span>{it.product_name || it.productName} × {it.quantity}</span>
                      <strong>₹{((it.price || 0) * (it.quantity || 1)).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                  <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "4px 0" }} />
                  {selectedOrder.subtotal !== undefined && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                      <span className="muted">Products Subtotal:</span>
                      <span>₹{(selectedOrder.subtotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {(selectedOrder.giftWrappingTotal || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                      <span className="muted">Artisan Gift Wrapping:</span>
                      <span>₹{(selectedOrder.giftWrappingTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", marginTop: "4px" }}>
                    <strong>Total Amount:</strong>
                    <strong style={{ color: "var(--color-primary)" }}>₹{(selectedOrder.totalAmount || selectedOrder.total || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>

              {/* Workflow Actions */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ marginBottom: "8px" }}>Fulfillment Lifecycle</h4>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: "13px" }}>Current:</span>
                  <span className={`status-pill ${selectedOrder.orderStatus || "placed"}`}>{selectedOrder.orderStatus || "placed"}</span>
                  <span className="muted" style={{ fontSize: "13px", marginLeft: "8px" }}>Payment:</span>
                  <span className={`status-pill ${selectedOrder.paymentStatus === "paid" ? "delivered" : "placed"}`}>{selectedOrder.paymentStatus || "pending"}</span>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  {(selectedOrder.orderStatus === "placed" || selectedOrder.orderStatus === "pending") && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(selectedOrder.orderId, selectedOrder.orderStatus, "confirmed")}
                    >
                      ✓ Confirm Order
                    </button>
                  )}
                  {selectedOrder.orderStatus === "confirmed" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(selectedOrder.orderId, selectedOrder.orderStatus, "packed")}
                    >
                      📦 Pack Hamper
                    </button>
                  )}
                  {selectedOrder.orderStatus === "packed" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(selectedOrder.orderId, selectedOrder.orderStatus, "shipped")}
                    >
                      🚚 Dispatch & Ship
                    </button>
                  )}
                  {selectedOrder.orderStatus === "shipped" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: "#166534", borderColor: "#166534" }}
                      onClick={() => handleStatusChange(selectedOrder.orderId, selectedOrder.orderStatus, "delivered")}
                    >
                      🎉 Mark Delivered
                    </button>
                  )}
                  {selectedOrder.orderStatus !== "delivered" && selectedOrder.orderStatus !== "cancelled" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: "#991b1b", borderColor: "#991b1b" }}
                      onClick={() => handleStatusChange(selectedOrder.orderId, selectedOrder.orderStatus, "cancelled")}
                    >
                      ✕ Cancel Order
                    </button>
                  )}
                </div>
              </div>

              <button onClick={() => setSelectedOrder(null)} className="btn btn-primary" style={{ marginTop: "8px" }}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
