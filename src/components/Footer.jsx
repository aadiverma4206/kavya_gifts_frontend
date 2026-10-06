import { useState } from "react";
import "./Footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    // No backend endpoint for newsletter signups yet — just acknowledge for now.
    setSubscribed(true);
    setEmail("");
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
              required
            />
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
          </form>
          {subscribed && <p className="muted">Thanks for subscribing!</p>}
        </div>
      </div>
      <p className="footer-bottom">© {new Date().getFullYear()} Kavya Gifting. All rights reserved.</p>
    </footer>
  );
}
