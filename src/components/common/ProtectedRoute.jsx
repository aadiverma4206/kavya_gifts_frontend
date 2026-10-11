import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Route & Role Guard Component.
 * Enforces authentication, role checks ('owner' vs 'customer'), and customer blocked status.
 */
export default function ProtectedRoute({ children, roleRequired }) {
  const { currentUser, userProfile, loading, isOwner, isBlocked, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: "100px 0" }}>
        <div
          style={{
            display: "inline-block",
            width: "36px",
            height: "36px",
            border: "3px solid #f3f3f3",
            borderTop: "3px solid var(--color-primary, #b76e79)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px",
          }}
        />
        <p className="muted">Verifying secure credentials...</p>
      </div>
    );
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
      // Customer or non-owner attempting unauthorized access
      return (
        <div className="container section" style={{ textAlign: "center", padding: "60px 20px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2>Administrative Access Denied</h2>
          <p className="muted" style={{ margin: "16px 0 24px" }}>
            This section is strictly restricted to verified Kavya Gifting store owners. Your current account does not have owner privileges.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/" className="btn btn-primary">Return to Storefront</Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                await logout();
                navigate("/owner/login");
              }}
            >
              Sign In with Owner Account
            </button>
          </div>
        </div>
      );
    }
    return children;
  }

  // 3. Customer Route requested
  if (roleRequired === "customer") {
    // If authenticated user is owner, redirect to owner portal
    if (isOwner) {
      return <Navigate to="/owner/dashboard" replace />;
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
            For assistance, please contact support at <strong>care@kavyagifting.com</strong>
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
