import { useState, useEffect } from "react";
import { Sparkles, Gift, Truck, ChevronRight, X } from "lucide-react";
import "./AnnouncementBar.css";

const ANNOUNCEMENTS = [
  {
    icon: Sparkles,
    badge: "FESTIVE SALE",
    text: "Free delivery on all luxury hampers above ₹999 — Code: KAVYALUXE",
  },
  {
    icon: Gift,
    badge: "COMPLIMENTARY",
    text: "Handcrafted Satin Ribbons & Personalized Wax-Sealed Note Included",
  },
  {
    icon: Truck,
    badge: "EXPRESS",
    text: "Guaranteed Next-Day Delivery across Delhi NCR, Mumbai & Bengaluru",
  },
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("kavya_announcement_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [dismissed]);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("kavya_announcement_dismissed", "true");
    } catch {}
  }

  if (dismissed) return null;

  const current = ANNOUNCEMENTS[index];
  const IconComponent = current.icon;

  return (
    <div className="announcement-bar" role="region" aria-label="Store Announcement">
      <div className="announcement-container container">
        <div className="announcement-content" key={index}>
          <span className="announcement-pill">
            <IconComponent size={13} className="announcement-pill-icon" />
            {current.badge}
          </span>
          <span className="announcement-text" aria-live="polite">
            {current.text}
          </span>
        </div>

        <button
          type="button"
          className="announcement-close"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
