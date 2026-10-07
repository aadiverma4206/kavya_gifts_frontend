import { useState } from "react";
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
    <div className="gift-wrap-selector card">
      <div className="gift-wrap-header">
        <div className="gift-wrap-title-wrap">
          <span className="gift-wrap-badge">Artisan Gift Wrapping</span>
          <h3>Add Luxury Gift Packaging & Card</h3>
          <p className="muted">
            Deliver an unforgettable unwrapping experience with bespoke velvet ribbons and a handwritten card.
          </p>
        </div>
        <button
          type="button"
          className={`btn ${value.enabled ? "btn-primary" : "btn-secondary"} btn-sm`}
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
          {value.enabled ? "✓ Gift Wrapping Added" : "+ Add Gift Wrapping"}
        </button>
      </div>

      {(value.enabled || isOpen) && (
        <div className="gift-wrap-body">
          <label className="gift-wrap-label">Choose Packaging Style:</label>
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
                    <h4>{opt.name}</h4>
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
                placeholder="e.g. Ananya & Rohit"
                value={value.recipientName || ""}
                onChange={(e) => handleFieldChange("recipientName", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Personalized Handwritten Gift Note (Optional)</label>
              <textarea
                rows="3"
                placeholder="Write your heartfelt message here (max 200 characters)..."
                maxLength={200}
                value={value.message || ""}
                onChange={(e) => handleFieldChange("message", e.target.value)}
              />
              <span className="char-count muted">
                {(value.message || "").length}/200 characters
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
