import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllOrdersForOwner, updateOrderStatus } from "../../services/orderService";

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  function loadOrders() {
    setLoading(true);
    getAllOrdersForOwner()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleStatusChange(orderId, nextStatus) {
    setStatusMsg("");
    try {
      await updateOrderStatus(orderId, { orderStatus: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, orderStatus: nextStatus } : o))
      );
      setStatusMsg(`Order ${orderId} status set to "${nextStatus}".`);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, orderStatus: nextStatus }));
      }
    } catch (err) {
      alert("Failed to update status.");
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

  return (
    <OwnerLayout
      title="Cart & Order Management"
      subtitle="Track customer bookings, artisan gift wrap messages, and delivery milestones"
    >
      {statusMsg && <div className="auth-alert success">{statusMsg}</div>}

      {loading ? (
        <p className="muted">Loading orders...</p>
      ) : (
        <div className="card owner-table-card">
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items Summary</th>
                  <th>Gift Wrapping</th>
                  <th>Total</th>
                  <th>Fulfillment Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td><strong>{ord.orderId}</strong></td>
                    <td>
                      <div>{ord.customer?.name}</div>
                      <span className="muted" style={{ fontSize: "12px" }}>
                        📞 {ord.customer?.phone}
                      </span>
                    </td>
                    <td>
                      {ord.items?.length} items:{" "}
                      <span className="muted">
                        {ord.items?.map((i) => `${i.product_name} (×${i.quantity})`).join(", ")}
                      </span>
                    </td>
                    <td>
                      {ord.giftWrap?.enabled ? (
                        <div>
                          <span className="wrap-tag-sm">🎁 {ord.giftWrap.optionName}</span>
                          {ord.giftWrap.message && (
                            <p style={{ fontStyle: "italic", fontSize: "11px", margin: "2px 0 0", color: "#92400e" }}>
                              "{ord.giftWrap.message.substring(0, 35)}..."
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                    <td><strong>₹{ord.total?.toLocaleString("en-IN")}</strong></td>
                    <td>
                      <select
                        value={ord.orderStatus || "placed"}
                        onChange={(e) => handleStatusChange(ord.orderId, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "13px" }}
                      >
                        <option value="placed">Placed</option>
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
                        <option value="completed">Completed</option>
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
                ))}
              </tbody>
            </table>
          </div>
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
                      <span>{it.product_name} × {it.quantity}</span>
                      <strong>₹{(it.price * it.quantity).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                  <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                    <strong>Total Amount:</strong>
                    <strong style={{ color: "var(--color-primary)" }}>₹{selectedOrder.total?.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedOrder(null)} className="btn btn-primary" style={{ marginTop: "12px" }}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
