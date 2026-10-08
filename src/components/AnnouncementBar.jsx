import { useState, useEffect } from "react";
import "./AnnouncementBar.css";

const ANNOUNCEMENTS = [
  "✨ Festive Special: Free delivery on luxury hampers above ₹999",
  "🎁 Handcrafted Custom Ribbons & Personalized Gift Cards Included",
  "🚚 Express Pan-India Delivery — Celebrate every moment with joy",
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="announcement-bar" role="region" aria-label="Store Announcement">
      <div className="announcement-content">
        <span className="announcement-text" key={index}>
          {ANNOUNCEMENTS[index]}
        </span>
      </div>
      <button
        type="button"
        className="announcement-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        ×
      </button>
    </div>
  );
}
