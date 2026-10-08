import "./LoadingSkeleton.css";

/**
 * Reusable shimmer loading skeleton component
 * @param {object} props
 * @param {string} [props.variant] - 'rectangular' | 'circular' | 'text' | 'card'
 * @param {string|number} [props.width] - custom width (e.g. '100%', '200px')
 * @param {string|number} [props.height] - custom height (e.g. '20px', '280px')
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
      <div className={`skeleton-card ${className}`} style={customStyles}>
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

  return (
    <div
      className={`skeleton-box skeleton-${variant} ${className}`}
      style={customStyles}
      aria-hidden="true"
    />
  );
}
