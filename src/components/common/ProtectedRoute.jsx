import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Inline style object for the credential verification spinner.
 * @constant {Object}
 */
/**
 * Official customer care support email address displayed on suspended account notices.
 * @constant {string}
 */
const SUPPORT_CONTACT_EMAIL = "care@kavyagifting.com";

/**
 * Target authentication entrypoints based on required authorization tier.
 * @constant {Record<string, string>}
 */
const AUTH_REDIRECT_PATHS = {
  owner: "/owner/login",
  customer: "/login",
  default: "/login",
};

/**
 * Canonical landing destinations for cross-role redirections.
 * @constant {Record<string, string>}
 */
const DASHBOARD_ROUTES = {
  owner: "/owner/dashboard",
  storefront: "/",
};

/**
 * Accessible credential verification loading indicator.
 * @param {{ message?: string }} props
 * @returns {JSX.Element}
 */
function LoadingFallback({ message = "Verifying secure credentials..." }) {
  return (
    <div className="container section" role="status" aria-live="polite" style={{ textAlign: "center", padding: "100px 0" }}>
      <div style={DEFAULT_SPINNER_STYLE} />
      <p className="muted">{message}</p>
    </div>
  );
}

/**
 * Renders an accessible unauthorized access notice for owner routes.
 * @param {{ onSwitchAccount: () => void }} props
 * @returns {JSX.Element}
 */
function AccessDeniedBanner({ onSwitchAccount }) {
  return (
    <div
      className="container section"
      role="alert"
      aria-labelledby="access-denied-heading"
      style={{ textAlign: "center", padding: "60px 20px", maxWidth: "600px", margin: "0 auto" }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
      <h2 id="access-denied-heading">Administrative Access Denied</h2>
      <p className="muted" style={{ margin: "16px 0 24px" }}>
        This section is strictly restricted to verified Kavya Gifting store owners. Your current account does not have owner privileges.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <Link to="/" className="btn btn-primary">Return to Storefront</Link>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSwitchAccount}
        >
          Sign In with Owner Account
        </button>
      </div>
    </div>
  );
}

const DEFAULT_SPINNER_STYLE = {
  display: "inline-block",
  width: "36px",
  height: "36px",
  border: "3px solid #f3f3f3",
  borderTop: "3px solid var(--color-primary, #b76e79)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  marginBottom: "16px",
};

/**
 * Route & Role Guard Component.
 * Enforces authentication, role checks ('owner' vs 'customer'), and customer blocked status.
 */
export default function ProtectedRoute({ children, roleRequired }) {
  const { currentUser, userProfile, loading, isOwner, isBlocked, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingFallback />;
  }

  // 1. Not authenticated
  if (!currentUser) {
    if (roleRequired === "owner") {
      return <Navigate to="/owner/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Owner Route requested
  if (roleRequired === "owner") {
    if (!isOwner) {
      return (
        <AccessDeniedBanner
          onSwitchAccount={async () => {
            await logout();
            navigate(AUTH_REDIRECT_PATHS.owner);
          }}
        />
      );
    }
    return children;
  }

  // 3. Customer Route requested
  if (roleRequired === "customer") {
    // If authenticated user is owner, redirect to owner portal
    if (isOwner) {
      return <Navigate to={DASHBOARD_ROUTES.owner} replace />;
    }

    // Check blocked status
    if (isBlocked) {
      return (
        <div className="container section" style={{ textAlign: "center", padding: "60px 20px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2>Account Temporarily Suspended</h2>
          <p className="muted" style={{ margin: "16px 0 24px" }}>
            Your customer account has been suspended by store administration. Access to checkout, profile, and orders is disabled.
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-primary, #b76e79)", marginBottom: "24px" }}>
            For assistance, please contact support at <strong>{SUPPORT_CONTACT_EMAIL}</strong>
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            Sign Out & Return Home
          </button>
        </div>
      );
    }

    return children;
  }

  // Default passthrough if authenticated
  return children;
}

export function OwnerRoute({ children }) {
  return <ProtectedRoute roleRequired="owner">{children}</ProtectedRoute>;
}

export function CustomerRoute({ children }) {
  return <ProtectedRoute roleRequired="customer">{children}</ProtectedRoute>;
}
