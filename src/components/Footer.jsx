import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Sparkles, HeartHandshake, Send, Mail, Phone, MapPin } from "lucide-react";
import { subscribeNewsletter } from "../services/newsletterService.js";
import { notify } from "../utils/notify.js";
import "./Footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubscribe(e) {
    e.preventDefault();
    const cleanEmail = (email || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      notify.warning("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    try {
      await subscribeNewsletter(cleanEmail);
      setStatusMessage("Thanks for subscribing to Kavya Gifts!");
      notify.success("Subscribed successfully! Welcome to Kavya Gifts.");
      setEmail("");
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      const msg = err.message || "Unable to subscribe. Please try again.";
      setStatusMessage(msg);
      notify.error(err, "Subscription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="site-footer" role="contentinfo">
      {/* Luxury Trust Badges Row */}
      <div className="footer-perks-band">
        <div className="container footer-perks-grid">
          <div className="perk-item">
            <div className="perk-icon-wrap">
              <Sparkles size={20} />
            </div>
            <div className="perk-text">
              <div className="perk-title">100% Handcrafted</div>
              <div className="perk-desc">Artisanal hampers with bespoke ribbons</div>
            </div>
          </div>
          <div className="perk-item">
            <div className="perk-icon-wrap">
              <Truck size={20} />
            </div>
            <div className="perk-text">
              <div className="perk-title">Express Pan-India</div>
              <div className="perk-desc">Fast, shockproof gift delivery</div>
            </div>
          </div>
          <div className="perk-item">
            <div className="perk-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <div className="perk-text">
              <div className="perk-title">Secure Checkout</div>
              <div className="perk-desc">Encrypted UPI, Cards & NetBanking</div>
            </div>
          </div>
          <div className="perk-item">
            <div className="perk-icon-wrap">
              <HeartHandshake size={20} />
            </div>
            <div className="perk-text">
              <div className="perk-title">Custom Keepsakes</div>
              <div className="perk-desc">Personal wax seal & calligraphy note</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container footer-main-grid">
        <div className="footer-col brand-col">
          <div className="footer-brand-title">
            <Sparkles size={18} className="footer-brand-icon" />
            <span>Kavya Gifting</span>
          </div>
          <p className="footer-tagline">
            Thoughtfully curated luxury hampers for every milestone, festival, and corporate celebration.
            Hand-assembled with love and delivered with elegance across India.
          </p>
          <div className="footer-contact-links">
            <div className="contact-item">
              <MapPin size={15} /> <span>New Delhi • Mumbai • Bengaluru</span>
            </div>
            <div className="contact-item">
              <Mail size={15} /> <span>concierge@kavyagifts.com</span>
            </div>
          </div>
        </div>

        <div className="footer-col">
          <h4>Signature Collections</h4>
          <Link to="/category/Diwali">Diwali Royal Hampers</Link>
          <Link to="/category/Wedding">Wedding Keepsakes</Link>
          <Link to="/category/Corporate">Corporate Suites</Link>
          <Link to="/category/Birthday">Birthday Surprises</Link>
          <Link to="/#catalog">All 100+ Catalog</Link>
        </div>

        <div className="footer-col">
          <h4>Customer Care</h4>
          <Link to="/orders">Track My Order</Link>
          <Link to="/dashboard">Customer Portal</Link>
          <Link to="/cart">Shopping Bag</Link>
          <Link to="/profile">Account Settings</Link>
        </div>

        <div className="footer-col newsletter-col">
          <h4>The Luxury Circle</h4>
          <p className="muted">Subscribe to receive secret festive coupon codes and early access to limited edition hampers.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email for newsletter"
              required
            />
            <button
              type="submit"
              className="footer-sub-btn"
              disabled={loading}
              aria-label="Subscribe"
            >
              {loading ? "..." : <Send size={16} />}
            </button>
          </form>
          {statusMessage && (
            <p className="status-msg" role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      <div className="container footer-bottom-wrap">
        <p className="footer-bottom-copy">
          © {new Date().getFullYear()} Kavya Gifting. Handcrafted with passion in India. All rights reserved.
        </p>
        <div className="footer-payment-tags">
          <span>UPI</span>
          <span>Visa</span>
          <span>Mastercard</span>
          <span>RuPay</span>
          <span>Net Banking</span>
        </div>
      </div>
    </footer>
  );
}
