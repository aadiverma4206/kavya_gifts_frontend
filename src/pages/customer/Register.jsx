import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  validateRegistrationStep1,
  validateRegistrationStep2,
} from "../../controllers/authController";
import { generateCaptcha } from "../../utils/captcha";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Eye, EyeOff } from "lucide-react";
import "./Auth.css";

/**
 * Sanitizes mobile number string by stripping non-digit characters and limiting to 10 digits.
 * @param {string} val - Raw mobile input.
 * @returns {string} Sanitized 10-digit number string.
 */
function sanitizeMobileInput(val) {
  return String(val || "").replace(/\D/g, "").slice(0, 10);
}

/**
 * Computes password security rating based on length, casing, numbers, and symbols.
 * @param {string} pwd - Raw password string.
 * @returns {{ score: number, label: string, color: string }}
 */
function computePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "Too Short", color: "#9ca3af" };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score: 2, label: "Medium", color: "#f59e0b" };
  return { score: 3, label: "Strong", color: "#10b981" };
}

export default function Register() {
  useDocumentTitle("Customer Registration - Kavya Luxury Gifts");
  const navigate = useNavigate();
  const { register } = useAuth();

  // Multi-step state: 1 (Personal Details) or 2 (Security & Verification)
  const [step, setStep] = useState(1);

  // STEP 1 Fields
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // STEP 2 Fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshCaptcha();
  }, []);

  function refreshCaptcha() {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
  }

  function handleStep1Submit(e) {
    e.preventDefault();
    setError("");

    // Validate Step 1 via Controller
    const validation = validateRegistrationStep1({
      fullName,
      mobile,
      email,
      address,
    });

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    // Advance to Step 2
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleStep2Submit(e) {
    e.preventDefault();
    setError("");

    // Validate Step 2 via Controller
    const validation = validateRegistrationStep2({
      password,
      confirmPassword,
      captchaInput,
      actualCaptcha: captchaCode,
    });

    if (!validation.isValid) {
      setError(validation.error);
      refreshCaptcha();
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service & Privacy Policy to create your account.");
      return;
    }

    setLoading(true);
    try {
      let cleanMobile = mobile.replace(/\D/g, "");
      if (cleanMobile.length === 11 && cleanMobile.startsWith("0")) cleanMobile = cleanMobile.slice(1);
      if (cleanMobile.length === 12 && cleanMobile.startsWith("91")) cleanMobile = cleanMobile.slice(2);

      const step1Payload = {
        fullName: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase(),
        address: address.trim(),
      };
      const step2Payload = {
        password,
        confirmPassword,
        captchaInput: captchaInput.trim(),
        actualCaptcha: captchaCode,
      };

      // Account is created in Firebase Auth and Firestore with sequential Customer ID
      const res = await register(step1Payload, step2Payload);
      const assignedId = res?.profile?.customerId || "CUS-10001";

      toast.success(`Registration Successful! Your Customer ID is ${assignedId}.`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email address already exists. Please sign in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError(err.message || "Failed to complete registration. Please try again.");
      }
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container container section">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-tag">Welcome to Kavya Gifting</span>
          <h2>Create Customer Account</h2>
          <p className="muted">
            {step === 1
              ? "Step 1 of 2: Personal & Delivery Information"
              : "Step 2 of 2: Password & Verification"}
          </p>
        </div>

        {/* Multi-Step Wizard Indicator */}
        <div className="auth-steps-indicator">
          <div
            className={`step-badge ${step >= 1 ? "active" : ""}`}
            onClick={() => setStep(1)}
            style={{ cursor: "pointer" }}
            title="Click to view personal details"
          >
            <span>1</span> Details
          </div>
          <div className="step-line" />
          <div className={`step-badge ${step === 2 ? "active" : ""}`}>
            <span>2</span> Security
          </div>
        </div>

        {error && <div className="auth-alert error" role="alert" aria-live="assertive">{error}</div>}

        {/* STEP 1: Personal & Delivery Information */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="auth-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Mobile Number (10 Digits) *</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "rgba(0,0,0,0.05)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: "6px", padding: "8px 10px", fontSize: "13.5px", fontWeight: 600, color: "var(--color-text)" }}>
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
                  maxLength={10}
                  style={{ flex: 1 }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                placeholder="e.g. priya@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Delivery / Billing Address *</label>
              <textarea
                rows="2"
                placeholder="Flat / House no, Building, Street, City, State, PIN"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Continue to Step 2 →
            </button>
          </form>
        )}

        {/* STEP 2: Password, Confirm Password, Captcha Code */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="auth-form">
            <div className="form-group">
              <label>Create Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)", display: "flex", alignItems: "center" }}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {Boolean(password) && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--color-muted, #777)" }}>Password Strength:</span>
                    <strong style={{ color: computePasswordStrength(password).color }}>
                      {computePasswordStrength(password).label}
                    </strong>
                  </div>
                  <div style={{ height: "4px", width: "100%", background: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(computePasswordStrength(password).score / 3) * 100}%`,
                        backgroundColor: computePasswordStrength(password).color,
                        transition: "width 0.3s ease, background-color 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password to match"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)", display: "flex", alignItems: "center" }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {Boolean(confirmPassword) && (
                <p style={{ fontSize: "12px", marginTop: "4px", color: password === confirmPassword ? "#166534" : "#dc2626" }}>
                  {password === confirmPassword ? "✓ Passwords match perfectly" : "✗ Passwords do not match yet"}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Captcha Verification *</label>
              <div className="captcha-wrapper">
                <div className="captcha-display" role="img" aria-label={`Captcha security code: ${captchaCode}`}>
                  {captchaCode}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={refreshCaptcha}
                  title="Generate new captcha code"
                >
                  ↻ Refresh
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter 5-character captcha code"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                required
                maxLength={5}
                style={{ marginTop: "8px", textTransform: "uppercase" }}
              />
            </div>

            <div className="form-group" style={{ margin: "14px 0" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "normal" }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ marginTop: "3px" }}
                  required
                />
                <span>
                  I agree to the <Link to="/terms" target="_blank" style={{ color: "var(--color-primary, #7a1f2b)", textDecoration: "underline" }}>Terms of Service</Link> and <Link to="/privacy" target="_blank" style={{ color: "var(--color-primary, #7a1f2b)", textDecoration: "underline" }}>Privacy Policy</Link>.
                </span>
              </label>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={loading}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? "Registering Account..." : "Complete Registration"}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p className="muted">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
