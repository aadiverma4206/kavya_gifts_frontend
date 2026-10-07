import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  validateRegistrationStep1,
  validateRegistrationStep2,
} from "../../controllers/authController";
import { generateCaptcha } from "../../utils/captcha";
import "./Auth.css";

export default function Register() {
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
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

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

    setLoading(true);
    try {
      const step1Payload = { fullName, mobile, email, address };
      const step2Payload = {
        password,
        confirmPassword,
        captchaInput,
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

        {error && <div className="auth-alert error">{error}</div>}

        {/* STEP 1: Personal & Delivery Information */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="auth-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Mobile Number (10 Digits) *</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                placeholder="e.g. priya@example.com"
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
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                placeholder="Re-enter password to match"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Captcha Verification *</label>
              <div className="captcha-wrapper">
                <div className="captcha-display" aria-label="Captcha code">
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
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
                maxLength={5}
                style={{ marginTop: "8px", textTransform: "uppercase" }}
              />
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(1);
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
