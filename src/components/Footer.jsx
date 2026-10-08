import { useState } from "react";
import { Link } from "react-router-dom";
import { subscribeNewsletter } from "../services/newsletterService.js";
import { notify } from "../utils/notify.js";
import "./Footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      notify.warning("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    try {
      await subscribeNewsletter(email.trim());
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
      <div className="container footer-grid">
        <div className="footer-col">
          <h3>Kavya Gifting</h3>
          <p className="muted">
            Thoughtfully curated hampers for every festival, celebration, and occasion — packed
            with care, delivered with love across India.
          </p>
        </div>

        <div className="footer-col">
          <h4>Shop Hampers</h4>
          <Link to="/category/Diwali">Diwali Hampers</Link>
          <Link to="/category/Wedding">Wedding Hampers</Link>
          <Link to="/category/Corporate">Corporate Hampers</Link>
          <Link to="/cart">My Shopping Cart</Link>
        </div>

        <div className="footer-col">
          <h4>Customer Care</h4>
          <Link to="/">About Our Craft</Link>
          <Link to="/orders">Track My Order</Link>
          <Link to="/profile">My Account</Link>
          <Link to="/dashboard">Customer Portal</Link>
        </div>

        <div className="footer-col">
          <h4>Newsletter</h4>
          <p className="muted">Get exclusive previews of seasonal hampers and festive offers.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email for newsletter"
              required
            />
            <button
              type="submit"
              className="btn btn-secondary footer-sub-btn"
              disabled={loading}
              aria-label="Subscribe"
            >
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
          {statusMessage && <p className="status-msg">{statusMessage}</p>}
        </div>
      </div>
      <p className="footer-bottom">
        © {new Date().getFullYear()} Kavya Gifting. Handcrafted with passion. All rights reserved.
      </p>
    </footer>
  );
}
