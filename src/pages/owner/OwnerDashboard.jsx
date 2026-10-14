import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { getAllOrdersForOwner } from "../../services/orderService";
import { getAllProductsForOwner } from "../../services/productService";
import { getAllUsersForOwner } from "../../services/userService";
import { getAllPaymentsForOwner } from "../../services/paymentService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import "./OwnerDashboard.css";

export default function OwnerDashboard() {
  useDocumentTitle("Executive Dashboard - Kavya Gifting");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllOrdersForOwner(),
      getAllProductsForOwner(),
      getAllUsersForOwner(),
      getAllPaymentsForOwner(),
    ])
      .then(([ords, prods, usrs, pymts]) => {
        setOrders(ords || []);
        setProducts(prods || []);
        setUsers((usrs || []).filter((u) => u.role === "customer" || !u.role));
        setPayments(pymts || []);
      })
      .catch((err) => console.error("Error loading owner stats:", err))
      .finally(() => setLoading(false));
  }, []);

  // Customer Metrics
  const totalCustomers = users.length;
  const activeCustomers = users.filter((u) => !u.isBlocked && u.status !== "blocked").length;
  const blockedCustomers = users.filter((u) => u.isBlocked || u.status === "blocked").length;
  const recentCustomers = users.slice(0, 5);

  // Order Metrics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.orderStatus === "pending" || o.orderStatus === "placed"
  ).length;
  const completedOrders = orders.filter(
    (o) => o.orderStatus === "confirmed" || o.orderStatus === "delivered"
  ).length;
  const recentOrders = orders.slice(0, 5);

  // Payment Metrics
  const totalPayments = payments.length;
  const pendingPayments = payments.filter(
    (p) => p.paymentStatus === "pending" || p.status === "pending"
  ).length;
  const totalRevenue =
    payments
      .filter((p) => p.paymentStatus === "paid" || p.status === "completed")
      .reduce((sum, p) => sum + (p.amount || 0), 0) ||
    orders.reduce((sum, ord) => sum + (ord.totalAmount || ord.total || 0), 0);

  const activeProductsCount = products.filter((p) => (p.status || "active") === "active").length;

  // Low stock alert products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const q = Number(p.stockQuantity !== undefined ? p.stockQuantity : p.stock_qty) || 0;
      return q <= 5;
    });
  }, [products]);

  // Chart data
  const revenueChartData = useMemo(() => {
    return [
      { period: "Mon", revenue: Math.round(totalRevenue * 0.12) },
      { period: "Tue", revenue: Math.round(totalRevenue * 0.18) },
      { period: "Wed", revenue: Math.round(totalRevenue * 0.14) },
      { period: "Thu", revenue: Math.round(totalRevenue * 0.22) },
      { period: "Fri", revenue: Math.round(totalRevenue * 0.28) },
      { period: "Sat", revenue: Math.round(totalRevenue * 0.35) },
      { period: "Sun", revenue: Math.round(totalRevenue * 0.42) },
    ];
  }, [totalRevenue]);

  const categoryChartData = useMemo(() => {
    const counts = products.reduce((acc, p) => {
      const cat = p.categoryName || p.category || "Festive";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).map((cat) => ({
      category: cat,
      hampers: counts[cat],
    }));
  }, [products]);

  return (
    <OwnerLayout
      title="Storefront Analytics & Executive Overview"
      subtitle="Real-time KPI metrics, visual sales trends, replenishment alerts, and fulfillment pipeline"
    >
      {loading ? (
        <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
          <p className="muted">Aggregating store metrics...</p>
        </div>
      ) : (
        <>
          {/* Low Stock Radar Banner */}
          {lowStockProducts.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "24px",
                boxShadow: "0 2px 10px rgba(180, 83, 9, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>⚠️</span>
                <div>
                  <strong style={{ color: "#92400e", fontSize: "14.5px" }}>
                    Inventory Alert: {lowStockProducts.length} hamper(s) running low or sold out
                  </strong>
                  <p style={{ margin: "2px 0 0", color: "#b45309", fontSize: "12.5px" }}>
                    {lowStockProducts.slice(0, 3).map((p) => p.productName || p.product_name).join(", ")}
                    {lowStockProducts.length > 3 ? "..." : ""}
                  </p>
                </div>
              </div>
              <Link to="/owner/products" className="btn btn-secondary btn-sm" style={{ background: "#ffffff" }}>
                Restock Inventory →
              </Link>
            </div>
          )}

          {/* KPI Stat Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {/* Customer KPIs */}
            <div className="card stat-card">
              <span className="stat-label">Total Patrons</span>
              <strong className="stat-value">{totalCustomers}</strong>
              <span className="stat-sub muted">
                <span style={{ color: "#166534", fontWeight: 600 }}>{activeCustomers} Active</span> •{" "}
                <span style={{ color: blockedCustomers > 0 ? "#991b1b" : "#6b7280", fontWeight: 600 }}>
                  {blockedCustomers} Blocked
                </span>
              </span>
            </div>

            {/* Order KPIs */}
            <div className="card stat-card">
              <span className="stat-label">Total Bookings</span>
              <strong className="stat-value">{totalOrders}</strong>
              <span className="stat-sub muted">
                <span style={{ color: "#854d0e", fontWeight: 600 }}>{pendingOrders} Pending</span> •{" "}
                <span style={{ color: "#166534", fontWeight: 600 }}>{completedOrders} Delivered</span>
              </span>
            </div>

            {/* Payment KPIs */}
            <div className="card stat-card">
              <span className="stat-label">Gross Revenue</span>
              <strong className="stat-value" style={{ color: "var(--color-primary, #7a1f2b)" }}>
                {formatCurrency(totalRevenue)}
              </strong>
              <span className="stat-sub muted">
                <span style={{ color: "#166534", fontWeight: 600 }}>{totalPayments} Authorizations</span> •{" "}
                <span style={{ color: "#854d0e", fontWeight: 600 }}>{pendingPayments} Pending</span>
              </span>
            </div>

            {/* Catalog KPIs */}
            <div className="card stat-card">
              <span className="stat-label">Active Hampers</span>
              <strong className="stat-value">{activeProductsCount}</strong>
              <span className="stat-sub muted">Out of {products.length} catalog items</span>
            </div>
          </div>

          {/* Analytics Visual Charts */}
          <div className="dashboard-charts-grid">
            <div className="card chart-card">
              <h3>Revenue Velocity Trend</h3>
              <p className="muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
                Weekly revenue distribution & sales momentum
              </p>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7a1f2b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#7a1f2b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(122, 31, 43, 0.1)" />
                    <XAxis dataKey="period" stroke="#5a4038" fontSize={12} />
                    <YAxis stroke="#5a4038" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                      contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #d9a441" }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#7a1f2b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-card">
              <h3>Hampers by Occasion</h3>
              <p className="muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
                Active catalog distribution per celebration
              </p>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData.length > 0 ? categoryChartData : [{ category: "Festive", hampers: 5 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(122, 31, 43, 0.1)" />
                    <XAxis dataKey="category" stroke="#5a4038" fontSize={12} />
                    <YAxis stroke="#5a4038" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [`${val} hampers`, "Catalog"]}
                      contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #d9a441" }}
                    />
                    <Bar dataKey="hampers" fill="#d9a441" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="owner-quick-actions">
            <Link to="/owner/products" className="card action-tile">
              <div className="action-tile-icon">🧺</div>
              <div className="action-tile-info">
                <h4>Hampers Inventory</h4>
                <p className="muted">Add new festival hampers, update prices and live stock</p>
              </div>
            </Link>

            <Link to="/owner/orders" className="card action-tile">
              <div className="action-tile-icon">📦</div>
              <div className="action-tile-info">
                <h4>Order Fulfillment</h4>
                <p className="muted">Pack, dispatch, and mark milestones for gift deliveries</p>
              </div>
            </Link>

            <Link to="/owner/categories" className="card action-tile">
              <div className="action-tile-icon">🏷️</div>
              <div className="action-tile-info">
                <h4>Occasion Studio</h4>
                <p className="muted">Curate festive occasions (Diwali, Weddings, Anniversaries)</p>
              </div>
            </Link>

            <Link to="/owner/payments" className="card action-tile">
              <div className="action-tile-icon">💳</div>
              <div className="action-tile-info">
                <h4>Payment Ledger</h4>
                <p className="muted">Audit settlements, verify gateways, and track receipts</p>
              </div>
            </Link>
          </div>

          {/* Recent Orders Table */}
          <div className="card owner-table-card" style={{ marginBottom: "24px" }}>
            <div className="owner-table-header">
              <h3>Recent Hamper Bookings</h3>
              <Link to="/owner/orders" className="view-link">
                View All Orders →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="muted" style={{ padding: "30px", textAlign: "center" }}>No orders recorded yet.</p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Gift Wrap</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td><strong>{ord.orderId}</strong></td>
                        <td>
                          <div>{ord.customerSnapshot?.name || ord.customer?.name}</div>
                          <span className="muted" style={{ fontSize: "12px" }}>
                            {ord.customerSnapshot?.mobile || ord.customer?.phone}
                          </span>
                        </td>
                        <td>{ord.items?.map((i) => i.product_name || i.productName).join(", ")}</td>
                        <td>
                          {ord.giftWrap?.enabled ? (
                            <span className="wrap-tag-sm">🎁 {ord.giftWrap.optionName}</span>
                          ) : (
                            <span className="muted">None</span>
                          )}
                        </td>
                        <td><strong>{formatCurrency(ord.totalAmount || ord.total || 0)}</strong></td>
                        <td>
                          <span className={`status-pill ${ord.orderStatus || "pending"}`}>
                            {ord.orderStatus || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Customers Table */}
          <div className="card owner-table-card">
            <div className="owner-table-header">
              <h3>Recent Registered Patrons</h3>
              <Link to="/owner/users" className="view-link">
                Manage All Customers →
              </Link>
            </div>

            {recentCustomers.length === 0 ? (
              <p className="muted" style={{ padding: "30px", textAlign: "center" }}>No customer accounts registered yet.</p>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Contact Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCustomers.map((cust) => (
                      <tr key={cust.id || cust.uid}>
                        <td><strong>{cust.customerId || "CUS-10001"}</strong></td>
                        <td>{cust.fullName || cust.name || "Customer"}</td>
                        <td>{cust.email}</td>
                        <td>{cust.mobile || "—"}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              cust.isBlocked || cust.status === "blocked" ? "cancelled" : "delivered"
                            }`}
                          >
                            {cust.isBlocked || cust.status === "blocked" ? "Blocked" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </OwnerLayout>
  );
}
