import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import "../customer/Auth.css";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const { loginOwner } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Authenticates and strictly verifies role === 'owner' via controller
      await loginOwner(email, password);
      toast.success("Administrator session established.");
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
        setError("Invalid owner credentials. Please verify your email and password.");
      } else {
        setError(err.message || "Failed to authenticate administrator.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container container section">
      <div className="auth-card card" style={{ borderTop: "4px solid var(--color-primary, #b76e79)" }}>
        <div className="auth-header">
          <span className="auth-tag" style={{ color: "var(--color-primary, #b76e79)" }}>
            Administrative Console
          </span>
          <h2>Owner Portal Login</h2>
          <p className="muted">
            Authorized administrative access for Kavya Gifting management
          </p>
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
            <label>Administrative Password *</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Authenticating Owner..." : "Enter Owner Dashboard"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: "24px", textAlign: "center" }}>
          <p className="muted">
            Looking for customer shopping? <Link to="/login">Customer Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
