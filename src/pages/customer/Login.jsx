import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./Auth.css";

export default function Login() {
  useDocumentTitle("Customer Sign In - Kavya Luxury Gifts");
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Customer Forgot Password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your Email or Customer ID and password.");
      return;
    }

    setLoading(true);
    try {
      // Authenticate via controller which verifies role & blocked status
      const { profile, redirectPath } = await loginCustomer(email, password);

      toast.success(`Welcome back, ${profile?.fullName || "Valued Customer"}!`);
      navigate(from === "/login" ? redirectPath : from, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      if (err.code === "ACCOUNT_BLOCKED") {
        setError(err.message);
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email address or password. Please verify and try again.");
      } else {
        setError(err.message || "Failed to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setForgotMsg("");
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotMsg("Please provide your registered email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(forgotEmail);
      setForgotMsg(res.message || "Password reset link sent! Please check your inbox.");
      toast.info("Password reset instructions sent.");
    } catch (err) {
      console.error("Reset password error:", err);
      if (err.code === "auth/user-not-found") {
        setForgotMsg("No account found with this email address.");
      } else {
        setForgotMsg(err.message || "Could not send reset email. Please try again.");
      }
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="auth-container container section">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-tag">Customer Portal</span>
          <h2>Sign In to Your Account</h2>
          <p className="muted">Track orders, write reviews, and checkout smoothly</p>
        </div>

        {error && (
          <div
            className="auth-alert error"
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fde8e8",
              color: "#c81e1e",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address or Customer ID</label>
            <input
              type="text"
              placeholder="e.g. priya@example.com or CUS-10001"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Password</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(!showForgot);
                  setForgotEmail(email);
                  setForgotMsg("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary, #b76e79)",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {showForgot ? "Close Reset" : "Forgot Password?"}
              </button>
            </div>
            <input
              type="password"
              placeholder="Your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {showForgot && (
            <div
              style={{
                background: "var(--color-bg-secondary, #fcf8f5)",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #fae8e0",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              <p style={{ margin: "0 0 8px 0", fontWeight: 500 }}>
                Enter your registered email for Firebase Password Reset:
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ flex: 1, padding: "8px 10px", fontSize: "13px" }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
              {forgotMsg && (
                <p
                  style={{
                    margin: "8px 0 0 0",
                    color: forgotMsg.includes("sent") ? "#0369a1" : "#c81e1e",
                    fontWeight: 600,
                  }}
                >
                  {forgotMsg}
                </p>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "24px", textAlign: "center" }}>
          <p className="muted">
            New to Kavya Gifting? <Link to="/register">Create an Account</Link>
          </p>
          <p className="muted" style={{ marginTop: "12px", fontSize: "12px" }}>
            Store Administrator? <Link to="/owner/login">Owner Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
