import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Sparkles, HeartHandshake, Send, Mail, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { subscribeNewsletter } from "../services/newsletterService.js";
import { notify } from "../utils/notify.js";
import "./Footer.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_YEAR = new Date().getFullYear();

/**
 * Validates whether the given string is a syntactically valid email address.
 * @param {string} email - Address to test.
 * @returns {boolean}
 */
function isValidEmail(email) {
  return Boolean(email && EMAIL_REGEX.test(String(email).trim()));
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubscribe(e) {
    e.preventDefault();
    const cleanEmail = (email || "").trim();
    if (!isValidEmail(cleanEmail)) {
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
              <Clock size={15} /> <span>Mon – Sun: 9:00 AM – 9:00 PM IST</span>
            </div>
            <div className="contact-item">
              <Mail size={15} />{" "}
              <a href="mailto:concierge@kavyagifts.com" style={{ color: "inherit", textDecoration: "none" }} title="Email Luxury Concierge">
                concierge@kavyagifts.com
              </a>
            </div>
            <div className="contact-item">
              <Phone size={15} />{" "}
              <a href="tel:+919999988888" style={{ color: "inherit", textDecoration: "none" }} title="Call Concierge Desk">
                +91 99999 88888
              </a>
            </div>
            <div className="contact-item">
              <span aria-hidden="true">💬</span>{" "}
              <a
                href="https://wa.me/919999988888?text=Hello%20Kavya%20Concierge,%20I%20have%20an%20inquiry%20regarding%20bespoke%20gifting"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline", fontSize: "12.5px" }}
                title="Chat on WhatsApp with Concierge"
              >
                WhatsApp Concierge Desk
              </a>
            </div>
          </div>
        </div>

        <div className="footer-col">
          <h4>Signature Collections</h4>
          <Link to="/category/Diwali">Diwali Royal Hampers</Link>
          <Link to="/category/Wedding">Wedding Keepsakes</Link>
          <Link to="/category/Corporate">Corporate Suites</Link>
          <Link to="/category/Birthday">Birthday Surprises</Link>
          <Link to="/category/Anniversary">Anniversary Hampers</Link>
          <Link to="/category/BabyShower">Baby Shower Gifts</Link>
          <Link to="/#catalog">All 100+ Catalog</Link>
        </div>

        <div className="footer-col">
          <h4>Customer Care</h4>
          <Link to="/orders">Track My Order</Link>
          <Link to="/dashboard">Customer Portal</Link>
          <Link to="/cart">Shopping Bag</Link>
          <Link to="/profile">Account Settings</Link>
          <Link to="/faq">Frequently Asked Questions</Link>
          <Link to="/contact">Contact Concierge</Link>
          <Link to="/returns">Return & Refund Policy</Link>
        </div>

        <div className="footer-col newsletter-col">
          <h4>The Luxury Circle</h4>
          <p className="muted">Subscribe to receive secret festive coupon codes and early access to limited edition hampers.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email for newsletter"
              onKeyDown={(e) => {
                if (e.key === "Escape") setEmail("");
              }}
              required
            />
            <button
              type="submit"
              className="footer-sub-btn"
              disabled={loading}
              aria-busy={loading}
              aria-label="Subscribe"
            >
              {loading ? "..." : <Send size={16} />}
            </button>
          </form>
          {statusMessage && (
            <p className="status-msg" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color="#166534" />
              <span>{statusMessage}</span>
            </p>
          )}
        </div>
      </div>

      <div className="container footer-bottom-wrap">
        <div className="footer-bottom-copy-group">
          <p className="footer-bottom-copy">
            © {CURRENT_YEAR} Kavya Gifting. Handcrafted with passion in India. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--color-muted, #777)", marginTop: "4px" }}>
            <Link to="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms of Service</Link>
          </div>
        </div>
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
