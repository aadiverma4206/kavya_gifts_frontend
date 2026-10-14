/**
 * Utility functions for consistent formatting across Kavya Gifts
 */

/**
 * Formats a numeric value into standard Indian Rupee currency format (₹).
 * @param {number|string} amount
 * @returns {string} Formatted currency string, e.g. "₹1,299"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "₹0";
  const cleaned = typeof amount === "string" ? amount.replace(/,/g, "").trim() : amount;
  const numeric = Number(cleaned) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Formats a timestamp / date into readable Indian localized format.
 * @param {string|number|Date|object} dateInput
 * @returns {string} Formatted date string, e.g. "08 Oct 2026, 04:30 PM"
 */
export function formatDate(dateInput) {
  if (!dateInput) return "N/A";

  let dateObj;
  // Support Firestore Timestamp objects with .toDate(), seconds, or _seconds
  if (typeof dateInput === "object" && typeof dateInput.toDate === "function") {
    dateObj = dateInput.toDate();
  } else if (typeof dateInput === "object" && (dateInput.seconds || dateInput._seconds)) {
    const sec = dateInput.seconds || dateInput._seconds;
    dateObj = new Date(sec * 1000);
  } else {
    dateObj = new Date(dateInput);
  }

  if (isNaN(dateObj.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

/**
 * Formats a timestamp into relative time string ("Just now", "2 hours ago", "Yesterday")
 * @param {string|number|Date|object} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return "Recently";
  let dateObj;
  if (typeof dateInput === "object" && typeof dateInput.toDate === "function") {
    dateObj = dateInput.toDate();
  } else if (typeof dateInput === "object" && (dateInput.seconds || dateInput._seconds)) {
    dateObj = new Date((dateInput.seconds || dateInput._seconds) * 1000);
  } else {
    dateObj = new Date(dateInput);
  }
  if (isNaN(dateObj.getTime())) return "Recently";

  const diffSec = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(dateObj);
}

/**
 * Truncates long text gracefully with an ellipsis.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateText(text, maxLen = 60) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "...";
}

/**
 * Standardizes order ID for display (e.g., #KG-1024)
 * @param {string|number} orderId
 * @returns {string}
 */
export function formatOrderId(orderId) {
  if (!orderId) return "#KG-0000";
  const str = String(orderId).replace(/^#/, "");
  return `#${str.toUpperCase()}`;
}

/**
 * Formats a price range string (e.g. ₹1,999 - ₹4,499)
 */
export function formatPriceRange(min, max) {
  const numMin = Number(min) || 0;
  const numMax = Number(max) || 0;
  const actualMin = Math.min(numMin, numMax);
  const actualMax = Math.max(numMin, numMax);
  const minStr = formatCurrency(actualMin);
  const maxStr = formatCurrency(actualMax);
  if (actualMin === actualMax) return minStr;
  return `${minStr} - ${maxStr}`;
}

/**
 * Returns formatted stock status text and color theme.
 */
export function formatStockBadge(stockQuantity) {
  const qty = Number(stockQuantity) || 0;
  if (qty <= 0) {
    return { text: "Out of Stock", level: "critical", isAvailable: false };
  }
  if (qty <= 5) {
    return { text: `Only ${qty} left`, level: "warning", isAvailable: true };
  }
  return { text: "In Stock", level: "success", isAvailable: true };
}

/**
 * Formats a 10-digit Indian phone number into standard "+91 XXXXX XXXXX" layout.
 * Supports numbers with +91, 91, or leading trunk 0.
 * @param {string|number} phone
 * @returns {string}
 */
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return String(phone);
}

/**
 * Formats a date into a clean short format (e.g. "10 Oct 2026").
 * @param {string|number|Date|object} dateInput
 * @returns {string}
 */
export function formatShortDate(dateInput) {
  if (!dateInput) return "N/A";
  let dateObj;
  if (typeof dateInput === "object" && typeof dateInput.toDate === "function") {
    dateObj = dateInput.toDate();
  } else if (typeof dateInput === "object" && (dateInput.seconds || dateInput._seconds)) {
    const sec = dateInput.seconds || dateInput._seconds;
    dateObj = new Date(sec * 1000);
  } else {
    dateObj = new Date(dateInput);
  }
  if (isNaN(dateObj.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Calculates delivery estimation date from business days.
 * @param {number} businessDays
 * @returns {string} e.g. "Arrives by Fri, 17 Oct"
 */
export function formatEstimatedDelivery(businessDays = 3) {
  const date = new Date();
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Calculates discount percentage between original price and sale price.
 * @param {number} original
 * @param {number} sale
 * @returns {number}
 */
export function calculateDiscountPercent(original, sale) {
  const orig = Number(original) || 0;
  const curr = Number(sale) || 0;
  if (orig <= curr || orig === 0) return 0;
  return Math.round(((orig - curr) / orig) * 100);
}
