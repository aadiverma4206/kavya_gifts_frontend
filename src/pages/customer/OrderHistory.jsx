import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { getOrdersByCustomer } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import { formatShortDate, formatCurrency } from "../../utils/formatters";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./OrderHistory.css";
import "./"
function getOrderStepIndex(status) {
  const s = (status || "pending").toLowerCase();
  if (s === "delivered") return 4;
  if (s === "shipped" || s === "out_for_delivery") return 3;
  if (s === "processing" || s === "packed") return 2;
  if (s === "confirmed") return 1;
  return 0; // pending / placed
}

function getEstimatedDeliveryDate(createdAt) {
  if (!createdAt) return "Within 3 business days";
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  if (isNaN(date.getTime())) return "Within 3 business days";
  const eta = new Date(date);
  eta.setDate(eta.getDate() + 3);
  return eta.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrderHistory() {
  useDocumentTitle("Order History - Kavya Luxury Gifts");
  const { currentUser, userProfile } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [toastMessage, setToastMessage] = useState("");
  const [collapsedOrders, setCollapsedOrders] = useState({});

  const handleBuyAgain = (ord) => {
    if (!ord.items || ord.items.length === 0) return;
    ord.items.forEach((item) => {
      addToCart(
        {
          id: item.productId || item.product_id,
          name: item.productName || item.product_name || "Gift Hamper",
          price: Number(item.price || 0),
          thumbnail: item.thumbnail || item.image || item.image_url,
        },
        item.quantity || 1
      );
    });
    showToast("Selected hamper(s) added to your cart!");
    setTimeout(() => {
      navigate("/cart");
    }, 700);
  };

  const toggleOrderItems = (orderKey) => {
    setCollapsedOrders((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const handleCopyOrderId = (id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(id)
        .then(() => showToast(`Copied Order ID: ${id}`))
        .catch(() => showToast(`Order ID: ${id}`));
    } else {
      showToast(`Order ID: ${id}`);
    }
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || statusFilter !== "all" || paymentFilter !== "all";

  const resetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setSortBy("newest");
  };

  useEffect(() => {
    const idToQuery = userProfile?.customerId || currentUser?.uid;
    if (idToQuery) {
      getOrdersByCustomer(idToQuery)
        .then((data) => setOrders(data || []))
        .catch((err) => {
          console.error("Error fetching order history:", err);
          setOrders([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  const displayedOrders = orders
    .filter((ord) => {
      // Status filter
      if (
        statusFilter !== "all" &&
        (ord.orderStatus || "pending").toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }
      // Payment filter
      if (paymentFilter !== "all") {
        const pStatus = (ord.paymentStatus || "pending").toLowerCase();
        if (paymentFilter === "paid" && pStatus !== "paid" && pStatus !== "completed") {
          return false;
        }
        if (paymentFilter !== "paid" && pStatus !== paymentFilter.toLowerCase()) {
          return false;
        }
      }
      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const idMatch = (ord.orderId || ord.id || "").toLowerCase().includes(term);
      const itemMatch = ord.items?.some((it) =>
        (it.productName || it.product_name || "").toLowerCase().includes(term)
      );
      const recipientMatch = (
        ord.giftWrap?.recipientName ||
        ord.customer?.name ||
        ord.customerSnapshot?.name ||
        ""
      )
        .toLowerCase()
        .includes(term);
      return idMatch || itemMatch || recipientMatch;
    })
    .sort((a, b) => {
      if (sortBy === "amount_desc") {
        return (
          Number(b.totalAmount || b.total || 0) -
          Number(a.totalAmount || a.total || 0)
        );
      }
      if (sortBy === "amount_asc") {
        return (
          Number(a.totalAmount || a.total || 0) -
          Number(b.totalAmount || b.total || 0)
        );
      }
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      if (sortBy === "oldest") {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

  return (
    <div className="orders-container container section">
      <div className="orders-header">
        <div>
          <h2>Order History</h2>
          <p className="muted">
            Track your bespoke hampers, delivery milestones, and leave product reviews
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Customer Orders Overview Metrics Bar */}
      {!loading && orders.length > 0 && (
        <>
          <div className="orders-metrics-grid">
            <div className="metric-tile">
              <div className="metric-icon-wrap">🎁</div>
              <div className="metric-info">
                <span className="metric-val">{orders.length}</span>
                <span className="metric-label">Total Hampers Ordered</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="metric-icon-wrap">💎</div>
              <div className="metric-info">
                <span className="metric-val">
                  {formatCurrency(
                    orders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || 0), 0)
                  )}
                </span>
                <span className="metric-label">Total Curated Value</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="metric-icon-wrap">🚚</div>
              <div className="metric-info">
                <span className="metric-val">
                  {
                    orders.filter(
                      (o) =>
                        !["delivered", "cancelled", "refunded"].includes(
                          (o.orderStatus || "").toLowerCase()
                        )
                    ).length
                  }
                </span>
                <span className="metric-label">Active Dispatches</span>
              </div>
            </div>
          </div>

          {/* Search Controls */}
          <div className="orders-filter-section">
            <div className="filter-top-row">
              <div className="orders-search-box">
                <span className="search-icon-inside">🔍</span>
                <input
                  type="text"
                  className="orders-search-input"
                  placeholder="Search by Order ID (#KG-...), hamper name, or recipient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchTerm("")}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Payment Filter Dropdown */}
              <div className="filter-controls-group">
                <select
                  className="filter-select"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  aria-label="Filter by payment status"
                >
                  <option value="all">Payment: All</option>
                  <option value="paid">Payment: Paid</option>
                  <option value="pending">Payment: Pending</option>
                  <option value="failed">Payment: Failed</option>
                  <option value="cancelled">Payment: Cancelled</option>
                </select>

                {/* Sort Order Dropdown */}
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort orders"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="status-tabs-row">
              {[
                { id: "all", label: "All Orders" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "shipped", label: "Shipped" },
                { id: "delivered", label: "Delivered" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`status-tab-btn ${statusFilter === tab.id ? "active" : ""}`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Filters Clear Row */}
            {hasActiveFilters && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed var(--color-border)" }}>
                <span style={{ fontSize: "12.5px", color: "var(--color-muted)" }}>
                  Showing {displayedOrders.length} of {orders.length} orders
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {loading && <p className="muted">Loading your orders...</p>}

      {!loading && orders.length === 0 && (
        <div className="card empty-orders-card">
          <span style={{ fontSize: "40px" }}>🎁</span>
          <h3>No Orders Found</h3>
          <p className="muted">You haven't placed any gift hamper bookings yet.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
            Explore Hampers
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && displayedOrders.length === 0 && (
        <div className="card empty-orders-card" style={{ padding: "40px 20px" }}>
          <span style={{ fontSize: "36px" }}>🔍</span>
          <h3>No Matching Orders Found</h3>
          <p className="muted">
            No orders match your current search or status filters.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "14px" }}
            onClick={resetAllFilters}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {!loading && displayedOrders.length > 0 && (
        <div className="orders-cards-list">
          {displayedOrders.map((ord, oIdx) => (
            <div key={ord.id || ord.orderId || oIdx} className="card order-card">
              {/* Card Header */}
              <div className="order-card-header">
                <div className="order-meta">
                  <span className="order-id-badge">{ord.orderId || `#KG-${oIdx + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyOrderId(ord.orderId || `#KG-${oIdx + 1}`)}
                    title="Copy Order ID to clipboard"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      padding: "2px 4px",
                      opacity: 0.75,
                    }}
                    aria-label="Copy Order ID"
                  >
                    📋
                  </button>
                  <span className="order-date muted">
                    {formatShortDate(ord.createdAt) !== "N/A"
                      ? formatShortDate(ord.createdAt)
                      : "Recently placed"}
                  </span>
                </div>
                <div className="order-status-group">
                  <span className={`status-pill ${ord.orderStatus || "pending"}`}>
                    {ord.orderStatus === "confirmed" ? "✓ Confirmed" : `Status: ${ord.orderStatus || "pending"}`}
                  </span>
                  <span className={`payment-pill ${ord.paymentStatus || "pending"}`}>
                    {ord.paymentStatus === "paid" || ord.paymentStatus === "completed"
                      ? "✓ Paid"
                      : ord.paymentStatus === "pending"
                      ? "Pending"
                      : ord.paymentStatus === "failed"
                      ? "Failed"
                      : ord.paymentStatus === "cancelled"
                      ? "Cancelled"
                      : ord.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Order Tracking Stepper */}
              {ord.orderStatus !== "cancelled" && (
                <div className="order-stepper-container">
                  <div className="stepper-header-row">
                    <span className="stepper-eta">
                      {ord.orderStatus === "delivered"
                        ? "✓ Successfully Delivered"
                        : `🚚 Estimated Delivery by: ${getEstimatedDeliveryDate(ord.createdAt)}`}
                    </span>
                    <span className="stepper-track-num">
                      {ord.trackingNumber || `TRACK: TRK-${(ord.orderId || "KG").slice(-6)}`}
                    </span>
                  </div>
                  <div className="stepper-steps">
                    <div className="stepper-connector">
                      <div
                        className="stepper-connector-fill"
                        style={{
                          width: `${(getOrderStepIndex(ord.orderStatus) / 4) * 100}%`,
                        }}
                      />
                    </div>
                    {["Placed", "Confirmed", "Packed", "Shipped", "Delivered"].map(
                      (step, sIdx) => {
                        const currentIdx = getOrderStepIndex(ord.orderStatus);
                        const isCompleted = sIdx <= currentIdx;
                        const isCurrent = sIdx === currentIdx;
                        return (
                          <div
                            key={step}
                            className={`stepper-item ${
                              isCompleted ? "completed" : ""
                            } ${isCurrent ? "current" : ""}`}
                          >
                            <div className="stepper-circle">
                              {isCompleted ? "✓" : sIdx + 1}
                            </div>
                            <span className="stepper-label">{step}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Gift Wrap Highlight */}
              {ord.giftWrap?.enabled && (
                <div className="order-card-giftwrap">
                  <span>🎁 Gift Wrap: <strong>{ord.giftWrap.optionName}</strong></span>
                  {ord.giftWrap.recipientName && (
                    <span> • Recipient: <strong>{ord.giftWrap.recipientName}</strong></span>
                  )}
                  {ord.giftWrap.message && (
                    <p className="order-gift-msg">"{ord.giftWrap.message}"</p>
                  )}
                </div>
              )}

              {/* Items List Header & Toggle */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "14px 0 8px",
                  paddingBottom: "4px",
                  borderBottom: "1px dashed var(--color-border)",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                  }}
                >
                  Hampers in this Order ({ord.items?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => toggleOrderItems(ord.orderId || oIdx)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#92400e",
                    cursor: "pointer",
                  }}
                >
                  {collapsedOrders[ord.orderId || oIdx] ? "▾ Show Hampers" : "▴ Hide Hampers"}
                </button>
              </div>

              {!collapsedOrders[ord.orderId || oIdx] && (
                <div className="order-items-grid">
                  {ord.items?.map((item, idx) => {
                    const pId = item.productId || item.product_id;
                    const pName = item.productName || item.product_name || "Gift Hamper";
                    const pImg =
                      item.thumbnail ||
                      item.image ||
                      item.image_url ||
                      (Array.isArray(item.images) && item.images[0]);
                    return (
                      <div key={idx} className="order-item-tile">
                        <img
                          src={
                            toDirectImageUrl(pImg) ||
                            "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E"
                          }
                          alt={pName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";
                          }}
                        />
                        <div className="order-item-desc">
                          <h4>{pName}</h4>
                          <p className="muted">
                            Qty: {item.quantity} • ₹
                            {Number(item.price || 0).toLocaleString("en-IN")} each
                          </p>
                          {pId && (
                            <Link
                              to={`/review/${pId}`}
                              state={{ productName: pName, orderId: ord.orderId }}
                              className="review-btn-link"
                            >
                              ★ Write Product Review
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Card Footer */}
              <div className="order-card-footer">
                <div className="delivery-summary">
                  <span className="muted">Delivering To:</span>{" "}
                  <strong>{ord.customer?.name || ord.customerSnapshot?.name || "Customer"}</strong>,{" "}
                  {ord.customer?.address || ord.customerSnapshot?.address || ord.deliveryAddress || "Address provided"}
                </div>
                <div className="order-total-summary">
                  <span>Total:</span>
                  <strong className="order-total-amt">
                    ₹{Number(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="orders-toast" role="status" aria-live="polite">
          <span>📋</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
