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
  const minStr = formatCurrency(min);
  const maxStr = formatCurrency(max);
  if (min === max) return minStr;
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
 * @param {string|number} phone
 * @returns {string}
 */
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
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

