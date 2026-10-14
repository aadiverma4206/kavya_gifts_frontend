import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAuth } from "../../context/AuthContext";
import { getOwnerSettings, updateOwnerSettings } from "../../services/settingsService";
import { notify } from "../../utils/notify";
import "./SettingsManagement.css";

export default function SettingsManagement() {
  useDocumentTitle("Store Configuration - Owner Portal");
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("brand"); // 'brand' | 'shipping' | 'announcement' | 'security'
  const [settings, setSettings] = useState({
    storeName: "Kavya Gifting",
    storeEmail: "care@kavyagifting.com",
    contactNumber: "+91 98765 43210",
    address: "Boutique Studio, New Delhi, India",
    deliveryEstimate: "2 - 4 Business Days",
    announcementText: "Festive Gifting Season: Complimentary handwritten calligraphy notes on all orders!",
    freeShippingThreshold: 2999,
    ownerEmail: "aadiverma4206@gmail.com",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOwnerSettings()
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          ...data,
          ownerEmail: currentUser?.email || data.ownerEmail || "aadiverma4206@gmail.com",
        }));
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  function handleChange(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOwnerSettings(settings);
      notify.success("Store configuration and parameters successfully updated!");
    } catch (err) {
      console.error("Save settings error:", err);
      notify.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <OwnerLayout
      title="Store Configuration & Policies Studio"
      subtitle="Manage boutique store parameters, contact details, free shipping threshold, and live announcement banner"
    >
      <div className="settings-studio-container">
        {/* Studio Tabs */}
        <div className="settings-tabs-bar">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === "brand" ? "active" : ""}`}
            onClick={() => setActiveTab("brand")}
          >
            <span>🏪</span> Brand & Contact Info
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === "shipping" ? "active" : ""}`}
            onClick={() => setActiveTab("shipping")}
          >
            <span>🚚</span> Shipping & Deliveries
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === "announcement" ? "active" : ""}`}
            onClick={() => setActiveTab("announcement")}
          >
            <span>📢</span> Announcement Ribbon
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <span>🛡️</span> Admin Security
          </button>
        </div>

        {loading ? (
          <div className="card owner-table-card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">Loading store settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Tab 1: Brand & Contact */}
            {activeTab === "brand" && (
              <div className="settings-card-panel">
                <h3 className="settings-panel-title">Brand Identity & Customer Support</h3>
                <p className="settings-panel-desc">
                  These details appear in email confirmations, packaging slips, and customer support pages.
                </p>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Boutique Store Name *</label>
                    <input
                      type="text"
                      value={settings.storeName}
                      onChange={(e) => handleChange("storeName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Customer Support Email *</label>
                    <input
                      type="email"
                      value={settings.storeEmail}
                      onChange={(e) => handleChange("storeEmail", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Helpline / WhatsApp Contact Number</label>
                    <input
                      type="text"
                      value={settings.contactNumber}
                      onChange={(e) => handleChange("contactNumber", e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Atelier & Studio Address</label>
                    <input
                      type="text"
                      value={settings.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "16px" }}>
                  {saving ? "Saving Changes..." : "Save Brand Settings"}
                </button>
              </div>
            )}

            {/* Tab 2: Shipping */}
            {activeTab === "shipping" && (
              <div className="settings-card-panel">
                <h3 className="settings-panel-title">Fulfillment & Shipping Thresholds</h3>
                <p className="settings-panel-desc">
                  Configure delivery timelines, free delivery threshold, and courier notes.
                </p>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Free Shipping Minimum Cart Value (₹)</label>
                    <input
                      type="number"
                      value={settings.freeShippingThreshold}
                      onChange={(e) => handleChange("freeShippingThreshold", Number(e.target.value) || 0)}
                      required
                    />
                    <span className="muted" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                      Orders above this amount qualify for complimentary expedited shipping.
                    </span>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Estimated Transit Timeline</label>
                    <input
                      type="text"
                      value={settings.deliveryEstimate}
                      onChange={(e) => handleChange("deliveryEstimate", e.target.value)}
                      placeholder="e.g. 2 - 4 Business Days"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "16px" }}>
                  {saving ? "Saving Changes..." : "Save Shipping Policies"}
                </button>
              </div>
            )}

            {/* Tab 3: Announcement */}
            {activeTab === "announcement" && (
              <div className="settings-card-panel">
                <h3 className="settings-panel-title">Top Announcement Ribbon</h3>
                <p className="settings-panel-desc">
                  The marquee ribbon visible at the very top of all customer storefront pages.
                </p>

                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "6px" }}>
                  Live Storefront Preview:
                </label>
                <div className="banner-live-preview">
                  <span>✨</span>
                  <span>{settings.announcementText || "Special festive gifting announcement!"}</span>
                </div>

                <div className="form-group">
                  <label>Announcement Ribbon Text *</label>
                  <textarea
                    rows={3}
                    value={settings.announcementText}
                    onChange={(e) => handleChange("announcementText", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontFamily: "inherit",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "16px" }}>
                  {saving ? "Saving Changes..." : "Update Announcement Bar"}
                </button>
              </div>
            )}

            {/* Tab 4: Security */}
            {activeTab === "security" && (
              <div className="settings-card-panel">
                <h3 className="settings-panel-title">Administrative Access & Security Guard</h3>
                <p className="settings-panel-desc">
                  Authentication is strictly enforced by Firebase Auth and role-based Firestore guards.
                </p>

                <div style={{ background: "#fdfaf6", padding: "18px", borderRadius: "10px", border: "1px solid #f0e6d2", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Configured Primary Owner Email</span>
                    <strong style={{ fontSize: "16px", color: "var(--color-primary, #7a1f2b)" }}>
                      {settings.ownerEmail || currentUser?.email || "aadiverma4206@gmail.com"}
                    </strong>
                    <span style={{ display: "block", fontSize: "12px", color: "#166534", marginTop: "2px", fontWeight: 600 }}>
                      ✓ Verified Firebase Administrator
                    </span>
                  </div>

                  <div>
                    <span className="muted" style={{ fontSize: "12px", display: "block" }}>Access Control Level</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a8a" }}>
                      Executive Owner (Full Storefront & Inventory Permissions)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </OwnerLayout>
  );
}
