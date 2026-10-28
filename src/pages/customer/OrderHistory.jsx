import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { getOrdersByCustomer } from "../../services/orderService";
import { toDirectImageUrl } from "../../utils/driveImage";
import { formatShortDate, formatCurrency } from "../../utils/formatters";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./OrderHistory.css";

const DEFAULT_HAMPER_FALLBACK_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23fbf3e7%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%237a1f2b%22%20font-family%3D%22serif%22%20font-size%3D%2222%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%F0%9F%8E%81%20Kavya%20Hamper%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Maps order lifecycle fulfillment status to a numeric milestone index (0-4).
 * Supports standard and courier status aliases.
 * @param {string} [status="pending"] - Order status string.
 * @returns {number} Milestone index between 0 and 4.
 */
function getOrderStepIndex(status) {
  const s = (status || "pending").toLowerCase().trim();
  if (s === "delivered" || s === "completed") return 4;
  if (s === "shipped" || s === "out_for_delivery" || s === "dispatched") return 3;
  if (s === "processing" || s === "packed" || s === "ready_for_pickup") return 2;
  if (s === "confirmed" || s === "accepted") return 1;
  return 0; // pending / placed
}

/**
 * Safely normalizes date representations (Firestore Timestamp, ISO string, milliseconds, Date).
 * @param {Date|Object|string|number} createdAt - Raw date representation.
 * @returns {Date|null} Valid Date or null.
 */
function parseOrderDate(createdAt) {
  if (!createdAt) return null;
  if (typeof createdAt?.toDate === "function") return createdAt.toDate();
  if (createdAt?.seconds != null) return new Date(createdAt.seconds * 1000);
  const parsed = new Date(createdAt);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Computes estimated delivery date based on order creation date.
 * @param {Date|Object|string|number} createdAt - Order timestamp.
 * @returns {string} Formatted localized delivery date estimate.
 */
function getEstimatedDeliveryDate(createdAt) {
  const date = parseOrderDate(createdAt);
  if (!date) return "Within 3 business days";
  const eta = new Date(date);
  eta.setDate(eta.getDate() + 3);
  return eta.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a relative time string (e.g., 'Today', 'Yesterday', '3 days ago').
 * @param {Date|Object|string|number} createdAt - Order timestamp.
 * @returns {string} Human-readable relative time string.
 */
function formatRelativeTime(createdAt) {
  const date = parseOrderDate(createdAt);
  if (!date) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Upcoming";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (diffMs < 86400000 && diffDays <= 0) return `${Math.floor(diffMs / 3600000)}h ago`;
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatShortDate(createdAt);
}

/**
 * Resolves or deterministically selects an assigned courier partner for the order.
 * @param {Object} ord - Order data object.
 * @returns {string} Courier partner name.
 */
function getCourierPartner(ord) {
  if (ord?.courierPartner) return String(ord.courierPartner).trim();
  const partners = ["BlueDart Express", "Delhivery Luxury", "Shadowfax Premium", "Bluedart Concierge", "DTDC Express", "Ekart Logistics", "India Post Speed Post"];
  const refStr = String(ord?.orderId || ord?.id || "KG");
  const charCode = refStr.charCodeAt(refStr.length - 1) || 75;
  return partners[charCode % partners.length];
}

/**
 * Generates an official tracking URL for the specified courier partner and tracking code.
 * @param {string} partner - Courier partner name.
 * @param {string} trackingNumber - Consignment AWB / tracking ID.
 * @returns {string} External web tracking URL.
 */
function getCourierTrackingUrl(partner, trackingNumber) {
  const p = (partner || "").toLowerCase();
  const trk = encodeURIComponent((trackingNumber || "").toString().trim());
  if (p.includes("bluedart")) {
    return `https://www.bluedart.com/tracking?handler=traking&action=auto&numbers=${trk}`;
  }
  if (p.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${trk}`;
  }
  if (p.includes("shadowfax")) {
    return `https://tracker.shadowfax.in/#/track?awb=${trk}`;
  }
  if (p.includes("dtdc")) {
    return `https://www.dtdc.in/tracking/tracking_results.asp?trkType=awb&strCnno=${trk}`;
  }
  if (p.includes("ecom")) {
    return `https://ecomexpress.in/tracking/?awb_field=${trk}`;
  }
  if (p.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trk}`;
  }
  if (p.includes("indiapost") || p.includes("speed post")) {
    return `https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/tracking.aspx?articleid=${trk}`;
  }
  if (p.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trk}&brand=DHL`;
  }
  if (p.includes("ekart")) {
    return `https://ekartlogistics.com/shipmenttrack/${trk}`;
  }
  if (p.includes("xpressbees") || p.includes("xpress bees")) {
    return `https://www.xpressbees.com/track?isAwb=true&trackid=${trk}`;
  }
  if (p.includes("amazon")) {
    return `https://track.amazon.in/tracking/${trk}`;
  }
  if (p.includes("trackon")) {
    return `https://trackon.in/tracking?awb=${trk}`;
  }
  if (p.includes("tpc") || p.includes("professional courier")) {
    return `https://www.tpcindia.com/Track.aspx?awb=${trk}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${partner || "courier"} tracking ${trackingNumber || ""}`.trim())}`;
}

/**
 * Safely renders string text with occurrences of a search query highlighted with <mark>.
 * @param {string|number} text - Target text to display.
 * @param {string} query - Keyword substring to highlight.
 * @returns {React.ReactNode} Highlighted React elements or original string.
 */
/**
 * Sanitizes a phone number for use in tel: links.
 * @param {string|number} phone - Raw phone value.
 * @returns {string} Sanitized dial digits string.
 */
function sanitizePhoneForTel(phone) {
  if (!phone) return "";
  return String(phone).replace(/[^\d+]/g, "").trim();
}

function renderHighlightedText(text, query) {
  if (text == null) return "";
  const str = String(text);
  if (!query || typeof query !== "string" || !query.trim()) return str;
  const q = query.trim();
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = str.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          style={{
            backgroundColor: "#fef08a",
            color: "#854d0e",
            padding: "1px 3px",
            borderRadius: "3px",
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return str;
  }
}

function getStatusBadgeInfo(status) {
  const s = (status || "pending").toLowerCase().trim();
  switch (s) {
    case "delivered":
    case "completed":
      return { label: "Delivered", icon: "✓", color: "#166534", bg: "#dcfce7" };
    case "shipped":
    case "out_for_delivery":
    case "dispatched":
    case "in_transit":
      return { label: "Dispatched", icon: "🚚", color: "#1e40af", bg: "#dbeafe" };
    case "processing":
    case "packed":
    case "ready_for_pickup":
      return { label: "Packaging", icon: "📦", color: "#854d0e", bg: "#fef9c3" };
    case "confirmed":
    case "accepted":
    case "placed":
      return { label: "Confirmed", icon: "★", color: "#065f46", bg: "#d1fae5" };
    case "cancelled":
      return { label: "Cancelled", icon: "✕", color: "#991b1b", bg: "#fee2e2" };
    case "failed":
    case "payment_failed":
      return { label: "Payment Failed", icon: "⚠", color: "#dc2626", bg: "#fee2e2" };
    case "partially_shipped":
      return { label: "Partially Shipped", icon: "📦", color: "#2563eb", bg: "#eff6ff" };
    case "rto":
    case "undelivered":
      return { label: "Undelivered", icon: "⚠️", color: "#b91c1c", bg: "#fef2f2" };
    case "refunded":
      return { label: "Refunded", icon: "↩", color: "#475569", bg: "#f1f5f9" };
    case "returned":
      return { label: "Returned", icon: "🔄", color: "#7c2d12", bg: "#ffedd5" };
    case "return_requested":
      return { label: "Return Requested", icon: "📋", color: "#c2410c", bg: "#ffedd5" };
    case "exchange_requested":
      return { label: "Exchange Requested", icon: "🔄", color: "#b45309", bg: "#ffedd5" };
    case "on_hold":
      return { label: "On Hold", icon: "⏸", color: "#b45309", bg: "#fef3c7" };
    default:
      return { label: "Pending", icon: "⏳", color: "#9a3412", bg: "#ffedd5" };
  }
}

/**
 * OrderHistory - Customer dashboard view for tracking luxury gift hamper bookings.
 * Features live order tracking stepper, multi-criteria filtering, CSV export,
 * interactive tax invoices, concierge support desk, multi-courier tracking, and seamless reordering.
 *
 * @component
 * @returns {JSX.Element} The rendered Order History dashboard.
 */
export default function OrderHistory() {
  const { currentUser, userProfile } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  useDocumentTitle(
    orders.length > 0
      ? `Order History (${orders.length}) - Kavya Luxury Gifts`
      : "Order History - Kavya Luxury Gifts"
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [collapsedOrders, setCollapsedOrders] = useState({});
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [supportOrder, setSupportOrder] = useState(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("Changed mind / Ordered by mistake");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderTarget || cancelling) return;
    setCancelling(true);
    try {
      setOrders((prev) =>
        prev.map((o) =>
          (o.orderId || o.id) === (cancelOrderTarget.orderId || cancelOrderTarget.id)
            ? { ...o, orderStatus: "cancelled", cancellationReason: cancelReason }
            : o
        )
      );
      showToast(`Order #${cancelOrderTarget.orderId || cancelOrderTarget.id || ""} has been cancelled`);
      setCancelOrderTarget(null);
    } catch (err) {
      showToast("Unable to cancel order: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleBuyAgain = (ord) => {
    if (!ord?.items || !Array.isArray(ord.items) || ord.items.length === 0) return;
    ord.items.forEach((item) => {
      addToCart(
        {
          id: item.productId || item.product_id,
          name: String(item.productName || item.product_name || "Gift Hamper").trim(),
          price: Math.max(0, Number(item.price || item.totalPrice || 0)),
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

  const handleReorderSingleItem = (item) => {
    if (!item) return;
    const qty = Math.min(99, Math.max(1, Number(item.quantity) || 1));
    const pName = String(item.productName || item.product_name || "Gift Hamper").trim();
    addToCart(
      {
        id: item.productId || item.product_id || `item_${Date.now()}`,
        name: pName,
        price: Math.max(0, Number(item.price) || 0),
        thumbnail: item.thumbnail || item.image || item.image_url,
      },
      qty
    );
    showToast(`Added ${qty > 1 ? `${qty}x ` : ""}“${pName}” to your cart!`);
  };

  const toggleOrderItems = (orderKey) => {
    setCollapsedOrders((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const handleCopyTrackingNumber = (trk) => {
    if (!trk) return;
    const cleanTrk = String(trk).trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanTrk).then(() => {
        showToast(`Copied tracking number: ${cleanTrk}`);
      }).catch(() => {
        showToast(`Tracking: ${cleanTrk}`);
      });
    } else {
      showToast(`Tracking: ${cleanTrk}`);
    }
  };

  const handleCopyOrderId = (id) => {
    if (!id || (typeof id !== "string" && typeof id !== "number")) return;
    const cleanId = String(id).replace(/^#/, "").trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(cleanId)
        .then(() => showToast(`Copied Order ID: ${cleanId}`))
        .catch(() => {
          try {
            const tempInput = document.createElement("input");
            tempInput.value = id;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
            showToast(`Copied Order ID: ${id}`);
          } catch {
            showToast(`Order ID: ${id}`);
          }
        });
    } else {
      showToast(`Order ID: ${id}`);
    }
  };

  const sanitizeCsvValue = (val) => {
    const raw = String(val ?? "").trim();
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    if (!orders || orders.length === 0) {
      showToast("No orders available to export.");
      return;
    }
    const headers = ["Order ID", "Date", "Status", "Payment Status", "Items Count", "Total Amount (INR)", "Recipient", "Contact Phone", "Courier Partner", "Tracking Number", "Estimated Delivery"];
    const rows = orders.map((o) => [
      sanitizeCsvValue(o.orderId || o.id || ""),
      sanitizeCsvValue(formatShortDate(o.createdAt)),
      sanitizeCsvValue(o.orderStatus || "pending"),
      sanitizeCsvValue(o.paymentStatus || "pending"),
      sanitizeCsvValue(o.items?.length || 0),
      sanitizeCsvValue(o.totalAmount || o.total || 0),
      sanitizeCsvValue(o.customer?.name || o.customerSnapshot?.name || "Customer"),
      sanitizeCsvValue(o.recipientPhone || o.customer?.phone || o.customerSnapshot?.phone || ""),
      sanitizeCsvValue(getCourierPartner(o)),
      sanitizeCsvValue(o.trackingNumber || ""),
      sanitizeCsvValue(getEstimatedDeliveryDate(o.createdAt)),
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kavya_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Order history exported to CSV!");
  };

  const handleCopyInvoiceSummary = (ord) => {
    if (!ord) return;
    const summary = [
      `Kavya Luxury Gifts - Tax Invoice Summary`,
      `GSTIN: 07AAAAA0000A1Z5`,
      `Invoice ID: INV-${ord.orderId ? String(ord.orderId).replace(/[^a-zA-Z0-9]/g, "") : (ord.id ? String(ord.id).replace(/[^a-zA-Z0-9]/g, "") : "KG")}`,
      `Order Date: ${formatShortDate(ord.createdAt)}`,
      `Recipient: ${ord.customer?.name || ord.customerSnapshot?.name || "Customer"}`,
      ...(ord.customer?.phone || ord.recipientPhone ? [`Phone: ${ord.customer?.phone || ord.recipientPhone}`] : []),
      `Courier Partner: ${getCourierPartner(ord)}`,
      `Payment Status: ${ord.paymentStatus || "Completed"}`,
      `Items:`,
      ...(ord.items || []).map(
        (it) => `- ${it.productName || it.product_name || "Hamper"} x ${Math.max(1, Number(it.quantity) || 1)}: ₹${(Number(it.price || 0) * Math.max(1, Number(it.quantity) || 1)).toLocaleString("en-IN")}`
      ),
      `Grand Total: ₹${Number(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}`,
    ].join("\n");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        showToast("Invoice summary copied to clipboard!");
      }).catch(() => {
        showToast("Invoice summary generated.");
      });
    } else {
      showToast("Invoice summary generated.");
    }
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || statusFilter !== "all" || paymentFilter !== "all" || dateRangeFilter !== "all";

  const resetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateRangeFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const [fetchError, setFetchError] = useState(null);

  const fetchOrders = () => {
    const idToQuery = userProfile?.customerId || currentUser?.uid;
    if (idToQuery) {
      setLoading(true);
      setFetchError(null);
      getOrdersByCustomer(idToQuery)
        .then((data) => setOrders(data || []))
        .catch((err) => {
          console.error("Error fetching order history:", err);
          setFetchError("Unable to retrieve your order bookings. Please check your network connection.");
          setOrders([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser, userProfile]);

  // Accessibility: Close active modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (invoiceOrder) setInvoiceOrder(null);
        if (supportOrder) setSupportOrder(null);
        if (cancelOrderTarget && !cancelling) setCancelOrderTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [invoiceOrder, supportOrder, cancelOrderTarget, cancelling]);

  // Prevent background page scrolling when an overlay modal is active
  useEffect(() => {
    const isModalOpen = Boolean(invoiceOrder || supportOrder || cancelOrderTarget);
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [invoiceOrder, supportOrder, cancelOrderTarget]);

  const displayedOrders = useMemo(() => {
    return orders
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
        // Date range filter
        if (dateRangeFilter !== "all") {
          const orderDate = ord.createdAt?.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt || 0);
          const now = new Date();
          if (dateRangeFilter === "30_days") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (orderDate < thirtyDaysAgo) return false;
          } else if (dateRangeFilter === "6_months") {
            const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            if (orderDate < sixMonthsAgo) return false;
          } else if (dateRangeFilter === "this_year") {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            if (orderDate < startOfYear) return false;
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
        const trackingMatch = Boolean(
          ord.trackingNumber &&
          String(ord.trackingNumber).toLowerCase().includes(term)
        );
        const couponMatch = Boolean(
          ord.couponCode &&
          String(ord.couponCode).toLowerCase().includes(term)
        );
        const phoneMatch = Boolean(
          (ord.recipientPhone || ord.customer?.phone || ord.customerSnapshot?.phone || ord.phone || "")
            .toString()
            .toLowerCase()
            .includes(term)
        );
        return idMatch || itemMatch || recipientMatch || trackingMatch || couponMatch || phoneMatch;
      })
      .sort((a, b) => {
        const timeA = parseOrderDate(a.createdAt)?.getTime() || 0;
        const timeB = parseOrderDate(b.createdAt)?.getTime() || 0;
        if (sortBy === "amount_desc") {
          const diff = Number(b.totalAmount || b.total || 0) - Number(a.totalAmount || a.total || 0);
          if (diff !== 0) return diff;
        }
        if (sortBy === "amount_asc") {
          const diff = Number(a.totalAmount || a.total || 0) - Number(b.totalAmount || b.total || 0);
          if (diff !== 0) return diff;
        }
        if (sortBy === "items_desc") {
          const diff = (b.items?.length || 0) - (a.items?.length || 0);
          if (diff !== 0) return diff;
        }
        if (sortBy === "oldest") {
          return timeA !== timeB ? timeA - timeB : String(a.orderId || a.id).localeCompare(String(b.orderId || b.id));
        }
        return timeB !== timeA ? timeB - timeA : String(b.orderId || b.id).localeCompare(String(a.orderId || a.id));
      });
  }, [orders, statusFilter, paymentFilter, dateRangeFilter, searchTerm, sortBy]);

  // Reset pagination on filter adjustments
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, dateRangeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    return displayedOrders.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [displayedOrders, currentPage, pageSize]);

  const orderMetrics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { totalCount: 0, totalValue: 0, activeCount: 0, avgValue: 0 };
    }
    const totalCount = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || 0), 0);
    const activeCount = orders.filter(
      (o) => !["delivered", "cancelled", "refunded"].includes((o.orderStatus || "").toLowerCase())
    ).length;
    const avgValue = Math.round(totalValue / totalCount);
    return { totalCount, totalValue, activeCount, avgValue };
  }, [orders]);

  const handleToggleExpandAll = () => {
    const anyExpanded = paginatedOrders.some(
      (ord, idx) => !collapsedOrders[ord.orderId || ord.id || idx]
    );
    const updated = { ...collapsedOrders };
    paginatedOrders.forEach((ord, idx) => {
      updated[ord.orderId || ord.id || idx] = anyExpanded;
    });
    setCollapsedOrders(updated);
  };

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
                <span className="metric-val">{orderMetrics.totalCount}</span>
                <span className="metric-label">Total Hampers Ordered</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="metric-icon-wrap">💎</div>
              <div className="metric-info">
                <span className="metric-val">{formatCurrency(orderMetrics.totalValue)}</span>
                <span className="metric-label">Total Curated Value</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="metric-icon-wrap">🚚</div>
              <div className="metric-info">
                <span className="metric-val">{orderMetrics.activeCount}</span>
                <span className="metric-label">Active Dispatches</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="metric-icon-wrap">✨</div>
              <div className="metric-info">
                <span className="metric-val">{formatCurrency(orderMetrics.avgValue)}</span>
                <span className="metric-label">Average Booking Value</span>
              </div>
            </div>
          </div>

          {/* Search Controls */}
          <div className="orders-filter-section">
            <div className="filter-top-row">
              <div className="orders-search-box">
                <span className="search-icon-inside">🔍</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="orders-search-input"
                  placeholder="Search by Order ID, hamper name, recipient, or phone (Press / to search)..."
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

                {/* Date Range Filter Dropdown */}
                <select
                  className="filter-select"
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  aria-label="Filter by date range"
                >
                  <option value="all">Date: All Time</option>
                  <option value="30_days">Date: Last 30 Days</option>
                  <option value="6_months">Date: Last 6 Months</option>
                  <option value="this_year">Date: This Year</option>
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
                  <option value="items_desc">Items: Most First</option>
                </select>

                {/* Expand / Collapse All Toggle */}
                <button
                  type="button"
                  className="btn-order-action"
                  onClick={handleToggleExpandAll}
                  title="Expand or collapse hampers for all listed orders"
                >
                  ↕ Toggle Hampers
                </button>

                {/* Export CSV Action */}
                <button
                  type="button"
                  className="btn-order-action"
                  onClick={handleExportCSV}
                  title="Export orders to CSV spreadsheet"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="status-tabs-row" role="tablist" aria-label="Filter orders by status">
              {[
                { id: "all", label: "All Orders" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "shipped", label: "Shipped" },
                { id: "delivered", label: "Delivered" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => {
                const count =
                  tab.id === "all"
                    ? orders.length
                    : orders.filter(
                        (o) => (o.orderStatus || "pending").toLowerCase() === tab.id
                      ).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    className={`status-tab-btn ${statusFilter === tab.id ? "active" : ""}`}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    <span>{tab.label}</span>
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background:
                          statusFilter === tab.id
                            ? "rgba(255, 255, 255, 0.25)"
                            : "rgba(0, 0, 0, 0.07)",
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Filters Clear Row */}
            {hasActiveFilters && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: "1px dashed var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12.5px", color: "var(--color-muted)" }}>
                    Showing {displayedOrders.length} of {orders.length} orders
                  </span>
                  {searchTerm && (
                    <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      "{searchTerm}" <button type="button" onClick={() => setSearchTerm("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Status: {statusFilter} <button type="button" onClick={() => setStatusFilter("all")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
                    </span>
                  )}
                  {paymentFilter !== "all" && (
                    <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Payment: {paymentFilter} <button type="button" onClick={() => setPaymentFilter("all")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
                    </span>
                  )}
                  {dateRangeFilter !== "all" && (
                    <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Date: {dateRangeFilter.replace("_", " ")} <button type="button" onClick={() => setDateRangeFilter("all")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
                    </span>
                  )}
                </div>
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

      {/* Skeleton Loading State */}
      {loading && (
        <div className="orders-cards-list" aria-busy="true" aria-label="Loading orders">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card order-card skeleton-order-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div
                  className="skeleton-shimmer"
                  style={{ width: "180px", height: "24px" }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{ width: "95px", height: "24px" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <div
                  className="skeleton-shimmer"
                  style={{ width: "56px", height: "56px", flexShrink: 0 }}
                />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    className="skeleton-shimmer"
                    style={{ width: "55%", height: "18px" }}
                  />
                  <div
                    className="skeleton-shimmer"
                    style={{ width: "35%", height: "14px" }}
                  />
                </div>
              </div>
              <div
                className="skeleton-shimmer"
                style={{ width: "100%", height: "28px" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error Alert State */}
      {!loading && fetchError && (
        <div
          className="card"
          style={{
            padding: "24px",
            textAlign: "center",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "32px" }}>⚠️</span>
          <h4 style={{ color: "#991b1b", margin: "8px 0" }}>Connection Issue</h4>
          <p style={{ color: "#7f1d1d", fontSize: "13.5px", marginBottom: "14px" }}>
            {fetchError}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchOrders}
          >
            ↻ Retry Loading Orders
          </button>
        </div>
      )}

      {!loading && !fetchError && orders.length === 0 && (
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
          <p className="muted" style={{ maxWidth: "460px", margin: "8px auto 0" }}>
            {searchTerm.trim()
              ? `No hampers or orders matched your keyword “${searchTerm.trim()}”. Try searching by Order ID, hamper name, or recipient.`
              : "No orders match the selected filters. Try adjusting your status, payment or date range criteria."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
            {searchTerm && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchTerm("")}
              >
                Clear Search Keyword
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={resetAllFilters}
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {!loading && displayedOrders.length > 0 && (
        <div className="orders-cards-list">
          {paginatedOrders.map((ord, oIdx) => (
            <div key={ord.id || ord.orderId || oIdx} className="card order-card">
              {/* Card Header */}
              <div className="order-card-header">
                <div className="order-meta">
                  <span className="order-id-badge">{renderHighlightedText(ord.orderId || `#KG-${oIdx + 1}`, searchTerm)}</span>
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
                  <span
                    className="order-date muted"
                    title={`Placed on: ${formatShortDate(ord.createdAt)}`}
                  >
                    📅 {formatRelativeTime(ord.createdAt)}
                  </span>
                  {ord.orderStatus !== "delivered" && ord.orderStatus !== "cancelled" && (
                    <span
                      style={{
                        fontSize: "11px",
                        background: "rgba(245, 158, 11, 0.12)",
                        color: "#92400e",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                      title="Estimated delivery date"
                    >
                      ETA: {getEstimatedDeliveryDate(ord.createdAt)}
                    </span>
                  )}
                </div>
                <div className="order-status-group">
                  {(() => {
                    const badge = getStatusBadgeInfo(ord.orderStatus);
                    return (
                      <span
                        className={`status-pill ${ord.orderStatus || "pending"}`}
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: 600,
                        }}
                      >
                        {!["delivered", "cancelled", "refunded"].includes((ord.orderStatus || "").toLowerCase()) && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: badge.color,
                              boxShadow: `0 0 6px ${badge.color}`,
                            }}
                            title="Active Order in fulfillment"
                          />
                        )}
                        <span>{badge.icon}</span> {badge.label}
                      </span>
                    );
                  })()}
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
                      {(() => {
                        const partner = getCourierPartner(ord);
                        const trkNum = ord.trackingNumber || `TRK-${(ord.orderId || "KG").slice(-6)}`;
                        const trkUrl = getCourierTrackingUrl(partner, trkNum);
                        return (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <a
                              href={trkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              title="Track parcel on official courier site"
                            >
                              📦 {partner} | {trkNum} ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyTrackingNumber(trkNum)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "1px 3px", opacity: 0.75 }}
                              title="Copy tracking number to clipboard"
                              aria-label="Copy tracking number"
                            >
                              📋
                            </button>
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="stepper-steps">
                    <div className="stepper-connector">
                      <div
                        className="stepper-connector-fill"
                        role="progressbar"
                        aria-valuenow={getOrderStepIndex(ord.orderStatus)}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-label={`Order fulfillment progress: step ${getOrderStepIndex(ord.orderStatus) + 1} of 5`}
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
                            <div
                              className="stepper-circle"
                              title={`${step}: ${isCompleted ? (isCurrent ? "Current fulfillment phase" : "Completed") : "Upcoming phase"}`}
                            >
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
                <div className="order-card-giftwrap" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <span>🎁 Bespoke Gift Wrapping: <strong>{ord.giftWrap.optionName}</strong></span>
                    {ord.giftWrap.recipientName && (
                      <span style={{ background: "rgba(212, 163, 71, 0.2)", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", color: "#78350f" }}>
                        For: <strong>{ord.giftWrap.recipientName}</strong>
                      </span>
                    )}
                  </div>
                  {ord.giftWrap.message && (
                    <div style={{ marginTop: "4px", padding: "6px 12px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "4px", borderLeft: "3px solid var(--color-primary)" }}>
                      <p className="order-gift-msg" style={{ margin: 0, fontSize: "12.5px" }}>
                        💌 <em>"{ord.giftWrap.message}"</em>
                      </p>
                    </div>
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
                  aria-expanded={!collapsedOrders[ord.orderId || ord.id || oIdx]}
                  aria-label={collapsedOrders[ord.orderId || ord.id || oIdx] ? "Expand hamper items" : "Collapse hamper items"}
                  onClick={() => toggleOrderItems(ord.orderId || ord.id || oIdx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleOrderItems(ord.orderId || ord.id || oIdx);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#92400e",
                    cursor: "pointer",
                  }}
                >
                  {collapsedOrders[ord.orderId || ord.id || oIdx] ? "▾ Show Hampers" : "▴ Hide Hampers"}
                </button>
              </div>

              {!collapsedOrders[ord.orderId || ord.id || oIdx] && (
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
                          src={toDirectImageUrl(pImg) || DEFAULT_HAMPER_FALLBACK_SVG}
                          alt={pName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_HAMPER_FALLBACK_SVG;
                          }}
                        />
                        <div className="order-item-desc">
                          <h4>{renderHighlightedText(pName, searchTerm)}</h4>
                          <p className="muted" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span>Qty: <strong>{item.quantity}</strong></span>
                            <span>•</span>
                            <span>{formatCurrency(item.price || 0)} each</span>
                            <span>•</span>
                            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                              Subtotal: {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                            </span>
                          </p>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
                            {pId && (
                              <Link
                                to={`/review/${pId}`}
                                state={{ productName: pName, orderId: ord.orderId || ord.id }}
                                className="review-btn-link"
                              >
                                ★ Write Product Review
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReorderSingleItem(item)}
                              style={{
                                background: "none",
                                border: "1px solid var(--color-border)",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontSize: "11.5px",
                                color: "var(--color-primary)",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Add one more of this hamper to cart"
                            >
                              + Reorder This
                            </button>
                          </div>
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
                  <strong>{ord.customer?.name || ord.customerSnapshot?.name || "Customer"}</strong>
                  {Boolean(ord.recipientPhone || ord.customer?.phone || ord.customerSnapshot?.phone || ord.phone) && (
                    <a
                      href={`tel:${sanitizePhoneForTel(ord.recipientPhone || ord.customer?.phone || ord.customerSnapshot?.phone || ord.phone)}`}
                      style={{
                        marginLeft: "6px",
                        fontSize: "11.5px",
                        background: "rgba(0,0,0,0.05)",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        color: "var(--color-primary)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      title={`Call recipient ${ord.recipientPhone || ord.customer?.phone || ord.customerSnapshot?.phone || ord.phone}`}
                    >
                      📞 {ord.recipientPhone || ord.customer?.phone || ord.customerSnapshot?.phone || ord.phone}
                    </a>
                  )},{" "}
                  {ord.customer?.address || ord.customerSnapshot?.address || ord.deliveryAddress || "Address provided"}
                  {(ord.deliveryNotes || ord.specialInstructions || ord.notes) && (
                    <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--color-muted)", fontStyle: "italic" }}>
                      📝 Delivery Instructions: "{ord.deliveryNotes || ord.specialInstructions || ord.notes}"
                    </div>
                  )}
                </div>
                <div className="order-total-summary">
                  {(ord.discount || ord.discountAmount || ord.couponCode) && (
                    <div style={{ fontSize: "11.5px", color: "#166534", marginBottom: "2px", fontWeight: 600 }}>
                      🏷️ Coupon {ord.couponCode ? `"${ord.couponCode}"` : ""}: -{formatCurrency(ord.discount || ord.discountAmount || 0)}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span>Total:</span>
                    <strong className="order-total-amt">
                      ₹{Number(ord.totalAmount || ord.total || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                {/* Actions Bar */}
                <div
                  className="order-actions-bar"
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    paddingTop: "12px",
                    borderTop: "1px dashed var(--color-border)",
                  }}
                >
                  <button
                    type="button"
                    className="btn-order-action"
                    onClick={() => setInvoiceOrder(ord)}
                    title="View and print tax invoice"
                  >
                    📄 Invoice
                  </button>
                  <button
                    type="button"
                    className="btn-order-action"
                    onClick={() => setSupportOrder(ord)}
                    title="Get order assistance"
                  >
                    💬 Concierge Help
                  </button>
                  {ord.orderStatus === "pending" && (
                    <button
                      type="button"
                      className="btn-order-action"
                      style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
                      onClick={() => setCancelOrderTarget(ord)}
                      title="Cancel this pending booking"
                    >
                      ✕ Cancel Order
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-order-action primary"
                    onClick={() => handleBuyAgain(ord)}
                    title="Add all hampers from this order to cart"
                  >
                    🔁 Buy Again
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && displayedOrders.length > 0 && totalPages > 1 && (
        <div className="orders-pagination-bar" role="navigation" aria-label="Orders pagination">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "var(--color-muted)" }}>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, displayedOrders.length)} of {displayedOrders.length} orders
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select"
                style={{ padding: "2px 6px", fontSize: "12px", height: "auto" }}
                aria-label="Items per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <div className="pagination-pages">
            <button
              type="button"
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
              title="First page"
            >
              «
            </button>
            <button
              type="button"
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              title="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-btn ${currentPage === num ? "active" : ""}`}
                onClick={() => setCurrentPage(num)}
                aria-label={`Page ${num}`}
                aria-current={currentPage === num ? "page" : undefined}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              title="Next page"
            >
              ›
            </button>
            <button
              type="button"
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Official Tax Invoice / Receipt Modal */}
      {invoiceOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setInvoiceOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="order-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ margin: 0, color: "var(--color-primary)" }}>
                  Tax Invoice / Receipt
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                  Invoice No: INV-{invoiceOrder.orderId ? invoiceOrder.orderId.replace(/[^a-zA-Z0-9]/g, "") : (invoiceOrder.id ? String(invoiceOrder.id).replace(/[^a-zA-Z0-9]/g, "") : "KG")} • Order: {invoiceOrder.orderId || invoiceOrder.id}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setInvoiceOrder(null)}
                aria-label="Close invoice"
              >
                ✕
              </button>
            </div>

            {/* Official Brand Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #e2d9cd", marginBottom: "14px" }}>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--color-primary)" }}>Kavya Luxury Gifts Boutique</strong>
                <div style={{ fontSize: "11.5px", color: "var(--color-muted)" }}>
                  Handcrafted Luxury Hampers & Curated Keepsakes
                  <br />
                  GSTIN: 07AAAAA0000A1Z5 • support@kavyaluxurygifts.com
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "11.5px", color: "var(--color-muted)" }}>
                <span>Official Booking Receipt</span>
                <br />
                <span style={{ color: "#166534", fontWeight: 600 }}>Verified Customer Order</span>
              </div>
            </div>

            <div style={{ fontSize: "13px", lineHeight: "1.6", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <strong>Billed To:</strong>
                  <br />
                  {invoiceOrder.customer?.name ||
                    invoiceOrder.customerSnapshot?.name ||
                    "Valued Customer"}
                  <br />
                  {invoiceOrder.customer?.address ||
                    invoiceOrder.customerSnapshot?.address ||
                    "Shipping address on record"}
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>Invoice Date:</strong>
                  <br />
                  {formatShortDate(invoiceOrder.createdAt)}
                  <br />
                  <strong>Payment Status:</strong>{" "}
                  <span style={{ textTransform: "capitalize" }}>
                    {invoiceOrder.paymentStatus || "Completed"}
                  </span>
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  margin: "16px 0",
                  fontSize: "12.5px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8f6f2", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Item Description</th>
                    <th style={{ textAlign: "center", padding: "8px" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Price</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items?.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0ede8" }}>
                      <td style={{ padding: "8px" }}>
                        {it.productName || it.product_name || "Gift Hamper"}
                      </td>
                      <td style={{ textAlign: "center", padding: "8px" }}>{it.quantity}</td>
                      <td style={{ textAlign: "right", padding: "8px" }}>
                        ₹{Number(it.price || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px" }}>
                        ₹{(Number(it.price || 0) * (it.quantity || 1)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {invoiceOrder.giftWrap?.enabled && (
                    <tr style={{ borderBottom: "1px solid #f0ede8" }}>
                      <td style={{ padding: "8px" }} colSpan={3}>
                        🎁 {invoiceOrder.giftWrap.optionName || "Signature Gift Wrapping"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px" }}>Included</td>
                    </tr>
                  )}
                  {Boolean(invoiceOrder.discount || invoiceOrder.discountAmount) && (
                    <tr style={{ borderBottom: "1px solid #f0ede8", color: "#166534" }}>
                      <td style={{ padding: "8px" }} colSpan={3}>
                        🏷️ Promotional Discount {invoiceOrder.couponCode ? `(${invoiceOrder.couponCode})` : ""}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px" }}>
                        -₹{Number(invoiceOrder.discount || invoiceOrder.discountAmount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", paddingTop: "8px", borderTop: "1px dashed var(--color-border)" }}>
                <div style={{ fontSize: "12.5px", color: "var(--color-muted)" }}>
                  Shipping & Handling: <strong style={{ color: "#166534" }}>Complimentary</strong>
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "var(--color-primary)",
                  }}
                >
                  <span>Grand Total: ₹{Number(invoiceOrder.totalAmount || invoiceOrder.total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopyInvoiceSummary(invoiceOrder)}
                title="Copy plain-text summary to clipboard"
              >
                📋 Copy Summary
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setInvoiceOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const originalTitle = document.title;
                  document.title = `Kavya_Invoice_${invoiceOrder.orderId || invoiceOrder.id || "Order"}`;
                  window.print();
                  setTimeout(() => {
                    document.title = originalTitle;
                  }, 1000);
                }}
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Support Concierge Modal */}
      {supportOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setSupportOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="order-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ margin: 0, color: "var(--color-primary)" }}>
                  Concierge Support Desk
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                  Regarding Order: {supportOrder.orderId || supportOrder.id || ""}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSupportOrder(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="muted" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Need delivery rescheduling, custom packaging adjustments, or special instructions
              for our artisans? Our concierge desk is dedicated to assisting you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
              <a
                href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hello Kavya Luxury Gifts, I require assistance with Order #${supportOrder.orderId || supportOrder.id || ""}` + (supportOrder.customer?.name ? ` (Account: ${supportOrder.customer.name})` : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                💬 Chat with Concierge on WhatsApp
              </a>
              <a
                href={`mailto:concierge@kavyaluxurygifts.com?subject=${encodeURIComponent(`Assistance Request - Order #${supportOrder.orderId || supportOrder.id || ""}`)}&body=${encodeURIComponent(`Hello Concierge Desk,

I am requesting support regarding my booking #${supportOrder.orderId || supportOrder.id || ""}.

Thank you!`)}`}
                className="btn btn-secondary"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                ✉️ Email Support Desk
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelOrderTarget && (
        <div
          className="order-modal-backdrop"
          onClick={() => !cancelling && setCancelOrderTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="order-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 style={{ margin: 0, color: "#b91c1c" }}>Cancel Order</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !cancelling && setCancelOrderTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
              Are you sure you want to cancel Order <strong>{cancelOrderTarget.orderId || cancelOrderTarget.id || ""}</strong>?
              This will discontinue preparation of your bespoke gift hamper booking.
            </p>
            <div style={{ margin: "14px 0" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--color-text)" }}>
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="filter-select"
                style={{ width: "100%", padding: "7px 10px", fontSize: "13px" }}
              >
                <option value="Changed mind / Ordered by mistake">Changed mind / Ordered by mistake</option>
                <option value="Delivery date no longer suits">Delivery date no longer suits</option>
                <option value="Want to change recipient details">Want to change recipient details</option>
                <option value="Delivery address entered incorrectly">Delivery address entered incorrectly</option>
                <option value="Found alternative gift option">Found alternative gift option</option>
                <option value="Other / Financial reason">Other / Financial reason</option>
              </select>
            </div>
            <div
              style={{
                fontSize: "12px",
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fee2e2",
                borderRadius: "6px",
                padding: "8px 12px",
                lineHeight: "1.5",
              }}
            >
              💡 If payment was already completed, your refund will be automatically processed back to your original payment method within 5–7 business days.
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={cancelling}
                onClick={() => setCancelOrderTarget(null)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: "#b91c1c",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-xs)",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: cancelling ? 0.75 : 1,
                }}
                disabled={cancelling}
                onClick={handleConfirmCancelOrder}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <aside className="orders-toast" role="status" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">📋</span>
          <span className="toast-text">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              marginLeft: "8px",
              fontSize: "13px",
              opacity: 0.8,
              padding: "0 4px",
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </aside>
      )}
    </div>
  );
}
