import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { saveUserProfile } from "../../services/userService";
import { changeCustomerPassword } from "../../services/authService";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import notify from "../../utils/notify";
import { Eye, EyeOff } from "lucide-react";
import "./ProfileManagement.css";

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Evaluates password complexity and returns visual score, label and indicator color.
 * @param {string} pwd - Raw password string.
 * @returns {{ score: number, label: string, color: string }}
 */
function evaluatePasswordStrength(pwd) {
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

/**
 * Strips non-digit characters from mobile input and restricts to 10 digits.
 * @param {string} val - Raw mobile number input.
 * @returns {string} Sanitized 10-digit number string.
 */
function sanitizePhoneInput(val) {
  return String(val || "").replace(/\D/g, "").slice(0, 10);
}

export default function ProfileManagement() {
  useDocumentTitle("Profile & Security - Kavya Luxury Gifts");
  const { currentUser, userProfile } = useAuth();

  // Profile details state
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [mobile, setMobile] = useState(userProfile?.mobile || "");
  const [address, setAddress] = useState(userProfile?.address || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.fullName) setFullName(userProfile.fullName);
      if (userProfile.mobile) setMobile(userProfile.mobile);
      if (userProfile.address) setAddress(userProfile.address);
    }
  }, [userProfile]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");

    if (!fullName.trim() || !mobile.trim()) {
      setProfileErr("Full name and mobile number are required.");
      return;
    }

    const cleanMobile = mobile.trim().replace(/\D/g, "");
    if (!INDIAN_MOBILE_REGEX.test(cleanMobile)) {
      setProfileErr("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSavingProfile(true);
    try {
      await saveUserProfile(currentUser.uid, {
        fullName: fullName.trim(),
        mobile: cleanMobile,
        address: address.trim(),
      });
      setProfileMsg("Profile updated successfully!");
      notify.success("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      const errMsg = err.message || "Could not update profile.";
      setProfileErr(errMsg);
      notify.error(errMsg);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg("");
    setPwdErr("");

    if (!currentPassword) {
      setPwdErr("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdErr("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdErr("New passwords do not match.");
      return;
    }

    setSavingPwd(true);
    try {
      await changeCustomerPassword(currentPassword, newPassword);
      setPwdMsg("Password changed successfully!");
      notify.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Password update error:", err);
      let errMsg = err.message || "Failed to update password.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        errMsg = "Current password is incorrect.";
      }
      setPwdErr(errMsg);
      notify.error(errMsg);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="profile-container container section">
      <div className="profile-header">
        <div>
          <h2>Account & Security</h2>
          <p className="muted">Manage your personal details and secure authentication settings</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="profile-grid">
        {/* Personal Profile Details */}
        <div className="profile-card card">
          <div className="card-top-header">
            <h3>Personal Information</h3>
            <span className="customer-badge">
              {userProfile?.customerId || "CUS-10001"}
            </span>
          </div>

          {profileMsg && <div className="auth-alert success">{profileMsg}</div>}
          {profileErr && <div className="auth-alert error">{profileErr}</div>}

          <form onSubmit={handleSaveProfile} className="auth-form">
            <div className="form-group">
              <label>Customer Reference ID</label>
              <input
                type="text"
                value={userProfile?.customerId || "CUS-10001"}
                disabled
                style={{ background: "#fbf3e7" }}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                style={{ background: "#fbf3e7" }}
              />
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(sanitizePhoneInput(e.target.value))}
                maxLength={10}
                required
              />
            </div>

            <div className="form-group">
              <label>Default Delivery Address</label>
              <textarea
                rows="3"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </form>
        </div>

        {/* Password Security */}
        <div className="profile-card card">
          <div className="card-top-header">
            <h3>Change Password</h3>
            <span className="security-badge">Firebase Auth</span>
          </div>
          <p className="muted" style={{ fontSize: "13px", marginBottom: "18px" }}>
            For your security, enter your current password followed by your new password.
          </p>

          {pwdMsg && <div className="auth-alert success">{pwdMsg}</div>}
          {pwdErr && <div className="auth-alert error">{pwdErr}</div>}

          <form onSubmit={handleChangePassword} className="auth-form">
            <div className="form-group">
              <label>Current Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd((prev) => !prev)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)", display: "flex", alignItems: "center" }}
                  title={showCurrentPwd ? "Hide password" : "Show password"}
                  aria-label={showCurrentPwd ? "Hide current password" : "Show current password"}
                >
                  {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((prev) => !prev)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)", display: "flex", alignItems: "center" }}
                  title={showNewPwd ? "Hide password" : "Show password"}
                  aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                >
                  {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {Boolean(newPassword) && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--color-muted, #777)" }}>Strength:</span>
                    <strong style={{ color: evaluatePasswordStrength(newPassword).color }}>
                      {evaluatePasswordStrength(newPassword).label}
                    </strong>
                  </div>
                  <div style={{ height: "4px", width: "100%", background: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(evaluatePasswordStrength(newPassword).score / 3) * 100}%`,
                        backgroundColor: evaluatePasswordStrength(newPassword).color,
                        transition: "width 0.3s ease, background-color 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((prev) => !prev)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted, #777)", display: "flex", alignItems: "center" }}
                  title={showConfirmPwd ? "Hide password" : "Show password"}
                  aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {Boolean(confirmNewPassword) && (
                <p style={{ fontSize: "12px", marginTop: "4px", color: newPassword === confirmNewPassword ? "#166534" : "#dc2626" }}>
                  {newPassword === confirmNewPassword ? "✓ New passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingPwd}>
              {savingPwd ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
