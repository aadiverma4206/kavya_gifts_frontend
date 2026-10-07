import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { useAuth } from "../../context/AuthContext";
import { getOwnerSettings, updateOwnerSettings } from "../../services/settingsService";

export default function SettingsManagement() {
  const { currentUser, userProfile } = useAuth();
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
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    getOwnerSettings()
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          ...data,
          ownerEmail: currentUser?.email || data.ownerEmail || "aadiverma4206@gmail.com",
        }));
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  function handleChange(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      await updateOwnerSettings(settings);
      setFeedback("Store configuration and parameters successfully updated!");
    } catch (err) {
      console.error("Save settings error:", err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <OwnerLayout
      title="Store Settings & Configuration"
      subtitle="Manage boutique store parameters, contact details, delivery policies, and administrative credentials"
    >
      {feedback && <div className="auth-alert success">{feedback}</div>}

      {loading ? (
        <p className="muted">Loading store settings...</p>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Card 1: Administrative Account Overview (Read-Only Security Card) */}
          <div className="card owner-table-card">
            <h3>Administrative Access Account</h3>
            <p className="muted" style={{ fontSize: "13.5px", margin: "4px 0 16px" }}>
              Owner authentication is secured through Firebase Authentication with role-based Firestore rules.
            </p>

            <div style={{ background: "#fdfaf6", padding: "16px", borderRadius: "8px", border: "1px solid #f0e6d2", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <span className="muted" style={{ fontSize: "12px", display: "block" }}>Configured Owner Email</span>
                <strong style={{ fontSize: "15px", color: "var(--color-primary)" }}>
                  {settings.ownerEmail || currentUser?.email || "aadiverma4206@gmail.com"}
                </strong>
                <span style={{ display: "block", fontSize: "11px", color: "#166534", marginTop: "2px", fontWeight: 600 }}>
                  ✓ Primary Administrative Account
                </span>
              </div>

              <div>
                <span className="muted" style={{ fontSize: "12px", display: "block" }}>Access Privilege</span>
                <span className="auth-tag" style={{ fontSize: "12px", padding: "3px 10px", display: "inline-block", marginTop: "2px" }}>
                  Store Owner (Full Administrative Rights)
                </span>
              </div>

              <div>
                <span className="muted" style={{ fontSize: "12px", display: "block" }}>Access Control Level</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a8a", display: "block", marginTop: "2px" }}>
                  Role-Based Security Guard Active
                </span>
                <span className="muted" style={{ fontSize: "11px" }}>
                  Customers and non-owners are strictly blocked from owner endpoints.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Store Identity & Contact */}
          <div className="card owner-table-card">
            <h3>Storefront Identity & Contact Information</h3>
            <p className="muted" style={{ fontSize: "13.5px", margin: "4px 0 16px" }}>
              Information displayed to customers on storefront footers, receipts, and order invoices.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>Boutique Store Name *</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => handleChange("storeName", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
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
              <div className="form-group">
                <label>Customer Support Hotline / WhatsApp *</label>
                <input
                  type="text"
                  value={settings.contactNumber}
                  onChange={(e) => handleChange("contactNumber", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Physical Studio / Dispatch Address *</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 3: Storefront Delivery & Announcement Parameters */}
          <div className="card owner-table-card">
            <h3>Delivery & Announcement Parameters</h3>
            <p className="muted" style={{ fontSize: "13.5px", margin: "4px 0 16px" }}>
              Configure customer delivery estimates and top-bar announcement banner text.
            </p>

            <div className="form-group">
              <label>Top Announcement Bar Message</label>
              <input
                type="text"
                placeholder="e.g. Free pan-India delivery on orders above ₹2,999"
                value={settings.announcementText}
                onChange={(e) => handleChange("announcementText", e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Standard Delivery Estimate</label>
                <input
                  type="text"
                  placeholder="e.g. 2 - 4 Business Days"
                  value={settings.deliveryEstimate}
                  onChange={(e) => handleChange("deliveryEstimate", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Free Shipping / Ribbon Threshold (₹ INR)</label>
                <input
                  type="number"
                  placeholder="2999"
                  value={settings.freeShippingThreshold}
                  onChange={(e) => handleChange("freeShippingThreshold", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: "10px 28px" }}
              >
                {saving ? "Saving Changes..." : "Save Store Settings"}
              </button>
            </div>
          </div>
        </form>
      )}
    </OwnerLayout>
  );
}
