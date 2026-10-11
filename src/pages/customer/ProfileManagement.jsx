import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { saveUserProfile } from "../../services/userService";
import { changeCustomerPassword } from "../../services/authService";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import notify from "../../utils/notify";
import "./ProfileManagement.css";

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
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Default Delivery Address</label>
              <textarea
                rows="3"
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
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
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
