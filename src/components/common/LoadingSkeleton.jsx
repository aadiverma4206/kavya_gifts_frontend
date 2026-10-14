import "./LoadingSkeleton.css";

/**
 * Reusable luxury shimmer loading skeleton component
 * @param {object} props
 * @param {string} [props.variant] - 'rectangular' | 'circular' | 'text' | 'card' | 'table-row' | 'stat-card'
 * @param {string|number} [props.width] - custom width
 * @param {string|number} [props.height] - custom height
 * @param {string} [props.borderRadius] - custom border radius
 * @param {string} [props.className] - additional class names
 */
export default function LoadingSkeleton({
  variant = "rectangular",
  width,
  height,
  borderRadius,
  className = "",
  style = {},
}) {
  const customStyles = {
    ...style,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(borderRadius ? { borderRadius } : {}),
  };

  if (variant === "card") {
    return (
      <div className={`skeleton-card ${className}`} style={customStyles} aria-busy="true">
        <div className="skeleton-box skeleton-card-image" />
        <div className="skeleton-card-body">
          <div className="skeleton-box skeleton-text" style={{ width: "70%", height: "20px" }} />
          <div className="skeleton-box skeleton-text" style={{ width: "40%", height: "16px", marginTop: "8px" }} />
          <div className="skeleton-box skeleton-text" style={{ width: "90%", height: "14px", marginTop: "12px" }} />
          <div className="skeleton-box skeleton-pill" style={{ width: "100%", height: "40px", marginTop: "16px" }} />
        </div>
      </div>
    );
  }

  if (variant === "stat-card") {
    return (
      <div className={`skeleton-stat-card ${className}`} style={customStyles} aria-busy="true">
        <div className="skeleton-box skeleton-circular" style={{ width: "44px", height: "44px" }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-box skeleton-text" style={{ width: "50%", height: "14px", marginBottom: "6px" }} />
          <div className="skeleton-box skeleton-text" style={{ width: "70%", height: "24px" }} />
        </div>
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <tr className={`skeleton-table-row ${className}`} aria-busy="true">
        <td colSpan={6} style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div className="skeleton-box skeleton-rectangular" style={{ width: "42px", height: "42px" }} />
            <div style={{ flex: 2 }}>
              <div className="skeleton-box skeleton-text" style={{ width: "60%", height: "16px", marginBottom: "6px" }} />
              <div className="skeleton-box skeleton-text" style={{ width: "40%", height: "12px" }} />
            </div>
            <div className="skeleton-box skeleton-text" style={{ flex: 1, height: "16px" }} />
            <div className="skeleton-box skeleton-pill" style={{ width: "80px", height: "26px" }} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div
      className={`skeleton-box skeleton-${variant} ${className}`}
      style={customStyles}
      aria-hidden="true"
    />
  );
}
