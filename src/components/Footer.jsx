import { useState } from "react";
import { subscribeNewsletter } from "../services/newsletterService.js";
import "./Footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatusMessage("");
    try {
      await subscribeNewsletter(email);
      setSubscribed(true);
      setStatusMessage("Thanks for subscribing!");
      setEmail("");
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      setStatusMessage(err.message || "Unable to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col">
          <h3>Kavya Gifting</h3>
          <p className="muted">
            Thoughtfully curated hampers for every festival, celebration, and occasion — packed
            with care, delivered with love.
          </p>
        </div>

        <div className="footer-col">
          <h4>Shop</h4>
          <a href="/category/Diwali">Diwali</a>
          <a href="/category/Wedding">Wedding</a>
          <a href="/category/Corporate">Corporate</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <a href="/">About Us</a>
          <a href="/">Contact</a>
          <a href="/">Track Order</a>
        </div>

        <div className="footer-col">
          <h4>Newsletter</h4>
          <p className="muted">Get notified about new hampers and festive offers.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
          {statusMessage && <p className="muted">{statusMessage}</p>}
        </div>
      </div>
      <p className="footer-bottom">© {new Date().getFullYear()} Kavya Gifting. All rights reserved.</p>
    </footer>
  );
}
