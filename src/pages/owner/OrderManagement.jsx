import { useEffect, useState, useMemo } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { getAllOrdersForOwner, updateOrderStatus } from "../../services/orderService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { notify } from "../../utils/notify";
import "./OrderManagement.css";

export default function OrderManagement() {
  useDocumentTitle("Orders Console - Owner Portal");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
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

  const WORKFLOW_STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"];

  function loadOrders() {
    setLoading(true);
    getAllOrdersForOwner()
      .then((data) => setOrders(data || []))
      .catch((err) => {
        console.error("Error loading orders:", err);
        notify.error("Failed to load customer orders.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleStatusChange(orderId, currentStatus, nextStatus) {
    const curr = (currentStatus || "placed").toLowerCase();
    const next = nextStatus.toLowerCase();

    if (curr === next) return;

    if (curr === "delivered" || curr === "cancelled") {
      alert(`Cannot modify order ${orderId} because it is already marked as "${curr}".`);
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[curr] || WORKFLOW_STEPS;
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
      notify.success(`Order ${orderId} moved to "${next}".`);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, orderStatus: next }));
      }
    } catch (err) {
      notify.error("Failed to update status: " + err.message);
    }
  }

  async function handlePaymentStatusChange(orderId, nextPaymentStatus) {
    try {
      await updateOrderStatus(orderId, { paymentStatus: nextPaymentStatus });
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, paymentStatus: nextPaymentStatus } : o))
      );
      notify.success(`Order ${orderId} payment status marked as "${nextPaymentStatus}".`);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, paymentStatus: nextPaymentStatus }));
      }
    } catch (err) {
      notify.error("Failed to update payment status.");
    }
  }

  const counts = useMemo(() => {
    const res = { all: orders.length, placed: 0, confirmed: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => {
      const st = (o.orderStatus || "placed").toLowerCase();
      if (st === "pending" || st === "placed") res.placed++;
      else if (res[st] !== undefined) res[st]++;
    });
    return res;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== "all") {
        const ordSt = (ord.orderStatus || "placed").toLowerCase();
        if (statusFilter === "placed") {
          if (ordSt !== "pending" && ordSt !== "placed") return false;
        } else if (ordSt !== statusFilter) {
          return false;
        }
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const oid = (ord.orderId || "").toLowerCase();
      const cname = (ord.customerSnapshot?.name || ord.customer?.name || "").toLowerCase();
      const cphone = (ord.customerSnapshot?.mobile || ord.customer?.phone || "").toLowerCase();
      const cid = (ord.customerId || "").toLowerCase();

      return oid.includes(term) || cname.includes(term) || cphone.includes(term) || cid.includes(term);
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <OwnerLayout
      title="Cart & Order Fulfillment Console"
      subtitle="Track customer bookings, artisan gift wrap messages, packaging, and dispatch milestones"
      actionButton={
        <button onClick={loadOrders} className="btn btn-secondary btn-sm">
          🔄 Refresh Orders
        </button>
      }
    >
      <div className="order-mgmt-container">
        {/* Status Filter Tabs */}
        <div className="order-status-tabs">
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Bookings ({counts.all})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "placed" ? "active" : ""}`}
            onClick={() => setStatusFilter("placed")}
          >
            ⏳ Placed / New ({counts.placed})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "confirmed" ? "active" : ""}`}
            onClick={() => setStatusFilter("confirmed")}
          >
            ✓ Confirmed ({counts.confirmed})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "packed" ? "active" : ""}`}
            onClick={() => setStatusFilter("packed")}
          >
            📦 Packed ({counts.packed})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "shipped" ? "active" : ""}`}
            onClick={() => setStatusFilter("shipped")}
          >
            🚚 In Transit ({counts.shipped})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "delivered" ? "active" : ""}`}
            onClick={() => setStatusFilter("delivered")}
          >
            🎉 Delivered ({counts.delivered})
          </button>
          <button
            type="button"
            className={`order-tab-btn ${statusFilter === "cancelled" ? "active" : ""}`}
            onClick={() => setStatusFilter("cancelled")}
          >
            ✕ Cancelled ({counts.cancelled})
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="order-filter-toolbar">
          <div className="order-search-box">
            <input
              type="text"
              placeholder="🔍 Search orders by ORD-#, recipient name, or 10-digit mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="muted" style={{ fontSize: "13px" }}>
            Showing {filteredOrders.length} filtered results
          </span>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading order records...</p>
          </div>
        ) : (
          <div className="card owner-table-card">
            {filteredOrders.length === 0 ? (
              <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
                No orders match your filter criteria.
              </p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Order ID & Date</th>
                      <th>Customer & Contact</th>
                      <th>Hamper Summary</th>
                      <th>Artisan Wrap</th>
                      <th>Total</th>
                      <th>Fulfillment</th>
                      <th>Payment</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((ord) => {
                      const currSt = ord.orderStatus || "placed";
                      const customerName = ord.customerSnapshot?.name || ord.customer?.name || "Customer";
                      const customerPhone = ord.customerSnapshot?.mobile || ord.customer?.phone || "";
                      return (
                        <tr key={ord.id || ord.orderId}>
                          <td>
                            <span className="order-id-badge">{ord.orderId}</span>
                            <span className="muted" style={{ display: "block", fontSize: "11px", marginTop: "2px" }}>
                              {formatDate(ord.createdAt || ord.orderDate)}
                            </span>
                          </td>
                          <td>
                            <div className="customer-meta-cell">
                              <span className="customer-name">{customerName}</span>
                              {customerPhone && (
                                <a
                                  href={`tel:${customerPhone}`}
                                  className="customer-contact-link"
                                  title="Call customer"
                                >
                                  📞 {customerPhone}
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{ord.items?.length || 0} items</span>
                            <span className="muted" style={{ display: "block", fontSize: "12px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ord.items?.map((i) => `${i.product_name || i.productName} (×${i.quantity})`).join(", ")}
                            </span>
                          </td>
                          <td>
                            {ord.giftWrap?.enabled || ord.giftWrappingSelected ? (
                              <div>
                                <span className="wrap-cell-badge">
                                  🎁 {ord.giftWrap?.optionName || "Artisan Wrap"}
                                </span>
                                {(ord.giftWrap?.message || ord.giftWrapMessage) && (
                                  <p className="wrap-preview-quote">
                                    "{(ord.giftWrap?.message || ord.giftWrapMessage)}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="muted" style={{ fontSize: "12.5px" }}>Standard</span>
                            )}
                          </td>
                          <td>
                            <strong style={{ fontSize: "14.5px", color: "var(--color-primary, #7a1f2b)" }}>
                              {formatCurrency(ord.totalAmount || ord.total || 0)}
                            </strong>
                          </td>
                          <td>
                            <select
                              value={currSt}
                              onChange={(e) => handleStatusChange(ord.orderId, currSt, e.target.value)}
                              disabled={currSt === "delivered" || currSt === "cancelled"}
                              className="status-dropdown-select"
                              style={{
                                color: currSt === "delivered" ? "#166534" : currSt === "cancelled" ? "#991b1b" : "#b45309",
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
                              className="status-dropdown-select"
                              style={{
                                color: ord.paymentStatus === "paid" || ord.paymentStatus === "completed" ? "#166534" : "#4b5563",
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="completed">Completed</option>
                              <option value="failed">Failed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
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
          <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="modal-card order-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--color-primary, #7a1f2b)" }}>
                    Order {selectedOrder.orderId}
                  </h3>
                  <span className="muted" style={{ fontSize: "12px" }}>
                    Booked on {formatDate(selectedOrder.createdAt || selectedOrder.orderDate)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              {/* Stepper */}
              {selectedOrder.orderStatus !== "cancelled" && (
                <div className="order-stepper-tracker">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const currIdx = WORKFLOW_STEPS.indexOf(selectedOrder.orderStatus || "placed");
                    const isCompleted = currIdx > idx;
                    const isCurrent = currIdx === idx;
                    return (
                      <div
                        key={step}
                        className={`step-node ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                      >
                        <div className="step-circle">{isCompleted ? "✓" : idx + 1}</div>
                        <span className="step-label">{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Customer Box */}
              <div style={{ background: "#fdfaf6", padding: "14px 16px", borderRadius: "10px", border: "1px solid #f3ebe1", marginTop: "12px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>Customer & Delivery Destination</h4>
                <div style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
                  <div>Name: <strong>{selectedOrder.customerSnapshot?.name || selectedOrder.customer?.name}</strong></div>
                  <div>Mobile: <strong>{selectedOrder.customerSnapshot?.mobile || selectedOrder.customer?.phone}</strong></div>
                  <div>Address: {selectedOrder.deliveryAddress || selectedOrder.customerSnapshot?.address || selectedOrder.customer?.address}</div>
                </div>
              </div>

              {/* Gift Wrap Notice */}
              {selectedOrder.giftWrap?.enabled && (
                <div style={{ background: "#fff8eb", padding: "14px 16px", borderRadius: "10px", border: "1px dashed #d9a441", marginTop: "12px" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "14px", color: "#92400e" }}>
                    🎁 Artisan Gift Wrap Instructions
                  </h4>
                  <div style={{ fontSize: "13px" }}>
                    <div>Theme: <strong>{selectedOrder.giftWrap.optionName}</strong></div>
                    {selectedOrder.giftWrap.recipientName && (
                      <div>Recipient: <strong>{selectedOrder.giftWrap.recipientName}</strong></div>
                    )}
                    {selectedOrder.giftWrap.message && (
                      <div style={{ marginTop: "6px", fontStyle: "italic", color: "#78350f", background: "#fef3c7", padding: "8px 12px", borderRadius: "6px" }}>
                        "{selectedOrder.giftWrap.message}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Receipt */}
              <div className="order-items-receipt">
                <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Packed Hamper Breakdown</h4>
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span>{it.product_name || it.productName} × {it.quantity}</span>
                    <strong>{formatCurrency((it.price || 0) * (it.quantity || 1))}</strong>
                  </div>
                ))}
                <div className="receipt-item-row" style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                  <span>Products Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal || 0)}</span>
                </div>
                {(selectedOrder.giftWrappingTotal || 0) > 0 && (
                  <div className="receipt-item-row">
                    <span>Artisan Gift Wrapping:</span>
                    <span>{formatCurrency(selectedOrder.giftWrappingTotal || 0)}</span>
                  </div>
                )}
                <div className="receipt-item-row" style={{ fontSize: "16px", fontWeight: "700", color: "var(--color-primary, #7a1f2b)" }}>
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedOrder.totalAmount || selectedOrder.total || 0)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                >
                  🖨️ Print Packing Slip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
