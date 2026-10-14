import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "../customer/Auth.css";

export default function OwnerLogin() {
  useDocumentTitle("Owner Portal Login - Kavya Gifting");
  const navigate = useNavigate();
  const { loginOwner } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your administrator email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginOwner(email, password);
      toast.success("Administrator session verified. Welcome back!");
      navigate("/owner/dashboard", { replace: true });
    } catch (err) {
      console.error("Owner login error:", err);
      if (err.code === "ACCESS_DENIED") {
        setError(err.message);
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid owner credentials. Please verify your administrative email and password.");
      } else {
        setError(err.message || "Failed to authenticate administrator.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container container section">
      <div
        className="auth-card card"
        style={{
          borderTop: "4px solid var(--color-primary, #7a1f2b)",
          boxShadow: "0 20px 45px rgba(122, 31, 43, 0.08)",
          maxWidth: "460px",
        }}
      >
        <div className="auth-header" style={{ textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(122, 31, 43, 0.1) 0%, rgba(183, 110, 121, 0.2) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              margin: "0 auto 12px",
              border: "1px solid rgba(122, 31, 43, 0.2)",
            }}
          >
            👑
          </div>
          <span className="auth-tag" style={{ color: "var(--color-primary, #7a1f2b)", letterSpacing: "1px" }}>
            EXECUTIVE CONSOLE
          </span>
          <h2 style={{ fontSize: "28px", marginTop: "4px" }}>Owner Portal Login</h2>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Restricted access for Kavya Gifting store operations & inventory
          </p>
        </div>

        {error && (
          <div
            className="auth-alert error"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              color: "#991b1b",
              fontSize: "13.5px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Administrator Email *</label>
            <input
              type="email"
              placeholder="owner@kavyagifting.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ margin: 0 }}>Administrative Password *</label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ background: "none", border: "none", fontSize: "12px", color: "var(--color-primary, #7a1f2b)", cursor: "pointer", fontWeight: 600 }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ background: "#fdfaf6", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f3ebe1", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
            <span>🔒</span>
            <span>Secured by Firebase Enterprise RBAC Authentication</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Authenticating Session..." : "Enter Owner Portal"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
          <p className="muted" style={{ fontSize: "13px" }}>
            Not an administrator? <Link to="/login" style={{ color: "var(--color-primary, #7a1f2b)", fontWeight: 600 }}>Customer Storefront Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
