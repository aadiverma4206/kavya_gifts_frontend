import { useState } from "react";
import { Gift, Sparkles, Check, Heart, Feather } from "lucide-react";
import { GIFT_WRAP_OPTIONS } from "../../context/CartContext";
import "./GiftWrapSelector.css";

export default function GiftWrapSelector({
  value = { enabled: false, optionId: "none", message: "", recipientName: "" },
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(value.enabled);

  function handleOptionSelect(optionId) {
    const isNone = optionId === "none";
    const selectedOption = GIFT_WRAP_OPTIONS.find((opt) => opt.id === optionId);
    onChange({
      ...value,
      enabled: !isNone,
      optionId,
      optionName: selectedOption?.name || "Gift Wrap",
      price: selectedOption?.price || 0,
    });
  }

  function handleFieldChange(field, val) {
    onChange({
      ...value,
      [field]: val,
    });
  }

  return (
    <div className={`gift-wrap-selector card ${value.enabled ? "enabled-active" : ""}`}>
      <div className="gift-wrap-header">
        <div className="gift-wrap-title-wrap">
          <div className="gift-badge-row">
            <span className="gift-wrap-badge">
              <Sparkles size={11} /> Bespoke Packaging
            </span>
            {value.enabled && <span className="active-pill-badge">Active</span>}
          </div>
          <h3 className="gift-wrap-headline">Add Luxury Velvet Gift Wrap & Keepsake Card</h3>
          <p className="muted gift-wrap-sub">
            Elevate your hamper with scented satin ribbons, wax seal stamp, and a personalized note.
          </p>
        </div>

        <button
          type="button"
          className={`btn ${value.enabled ? "btn-primary" : "btn-secondary"} btn-sm btn-wrap-toggle`}
          onClick={() => {
            const nextEnabled = !value.enabled;
            setIsOpen(nextEnabled);
            onChange({
              ...value,
              enabled: nextEnabled,
              optionId: nextEnabled && value.optionId === "none" ? "velvet" : value.optionId,
            });
          }}
        >
          {value.enabled ? (
            <>
              <Check size={14} /> Gift Wrap Included
            </>
          ) : (
            <>
              <Gift size={14} /> + Add Gift Wrapping
            </>
          )}
        </button>
      </div>

      {(value.enabled || isOpen) && (
        <div className="gift-wrap-body">
          <label className="gift-wrap-label">Select Packaging Style:</label>
          <div className="gift-options-grid">
            {GIFT_WRAP_OPTIONS.map((opt) => {
              const isSelected = value.optionId === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`gift-option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleOptionSelect(opt.id)}
                >
                  <div className="gift-option-top">
                    <div className="option-title-group">
                      <span className="option-radio-dot">{isSelected && <Check size={10} />}</span>
                      <h4>{opt.name}</h4>
                    </div>
                    <span className="gift-option-price">
                      {opt.price === 0 ? "Free" : `+₹${opt.price}`}
                    </span>
                  </div>
                  <p className="gift-option-desc muted">{opt.description}</p>
                </div>
              );
            })}
          </div>

          <div className="gift-message-section">
            <div className="form-group">
              <label>Recipient Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Ananya & Siddharth"
                value={value.recipientName || ""}
                onChange={(e) => handleFieldChange("recipientName", e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="label-with-icon">
                <Feather size={14} />
                <label>Personalized Handwritten Gift Note (Optional)</label>
              </div>
              <textarea
                rows="3"
                placeholder="Write your heartfelt message here (max 200 characters)..."
                maxLength={200}
                value={value.message || ""}
                onChange={(e) => handleFieldChange("message", e.target.value)}
              />
              <div className="char-count-row">
                <span className="calligraphy-hint">✒️ Written in gold ink on textured ivory cardstock</span>
                <span className="char-count muted">
                  {(value.message || "").length}/200 characters
                </span>
              </div>
            </div>

            {/* Live Gift Note Card Preview */}
            {value.message && (
              <div className="live-card-preview">
                <div className="card-preview-wax-seal">★</div>
                <div className="card-preview-inner">
                  {value.recipientName && (
                    <div className="card-preview-recipient">Dearest {value.recipientName},</div>
                  )}
                  <p className="card-preview-text">"{value.message}"</p>
                  <div className="card-preview-signoff">With Warmest Wishes • Kavya Gifting</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
