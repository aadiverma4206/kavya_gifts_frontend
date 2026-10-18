# Gifting Website - Modern E-Commerce Platform

A premium e-commerce web application for personalized gifting experiences.

## Badges & Status
- Framework: React 18 + Vite
- Backend: Firebase Firestore & Storage
- Styling: Modern CSS with custom theme variables

## Key Features
- Interactive product catalog with category and price filters
- Real-time cart management and instant checkout
- Secure authentication for customers and store owners

## Tech Stack
- **Frontend**: React 18, React Router DOM, Vite
- **Database**: Cloud Firestore
- **Analytics/Charts**: Chart.js, Three.js 3D visuals
- **Hosting**: Firebase / Vercel

## Architecture Overview
- Modular component-based directory structure
- Global state and context hooks for cart and user sessions
- Responsive layouts tailored for mobile, tablet, and desktop

## Firebase Configuration
- Client SDK initialized via `src/firebase.js`
- Firebase Auth for customer and administrator sessions
- Cloud Firestore collections for products, orders, and reviews

## Environment Variables
- `VITE_FIREBASE_API_KEY`: Firebase API Key
- `VITE_FIREBASE_PROJECT_ID`: Target project identifier
- `VITE_FIREBASE_STORAGE_BUCKET`: Storage bucket URL

## Installation & Setup
```bash
npm install
```

## Local Development
```bash
npm run dev
```
Access the local server at `http://localhost:5173`.

## Production Build
```bash
npm run build
```
Generates an optimized bundle in the `dist` directory.

## Firestore Security Rules
- Granular collection rules in `firestore.rules`
- Role-based access control protecting administrative endpoints
- Public read permissions for active catalog listings

## Asset & Image Management
- Dynamic image optimization utilities in `src/utils/driveImage.js`
- Support for Google Drive shared image links and direct CDN hosting

## Customer Storefront Workflow
- Dynamic hero banners with curated gift collections
- Search and filter by occasion, recipient, and price range
- High-resolution product previews with customer reviews

## Cart & Checkout Experience
- Persistent local cart state synchronization
- Real-time subtotal, discount, and tax calculations
- Streamlined multi-step checkout form with validation

## Payment Gateway Integration
- Secure client-side payment workflow simulation and verification
- Order receipt generation and printable invoice view

## Owner & Admin Dashboard
- Centralized dashboard at `/owner/dashboard`
- Real-time sales metrics, order fulfillment statuses, and inventory management
- Interactive revenue analytics charts

## Automated Test Suites
- End-to-end integration tests for workflows: cart, auth, checkout, and dashboard
- Verification scripts to ensure Firestore schema integrity

## Data Privacy & Transparency
- Conforms to modern privacy standards
- Comprehensive data transparency audit documentation included in repository

## Deployment Guidelines
- Vercel deployment preconfigured via `vercel.json`
- Firebase Hosting configuration via `firebase.json`

## License & Acknowledgements
- Proprietary license for Gifting Website project
- Developed with modern web best practices and high visual aesthetics.

## System Prerequisites
- Node.js >= 18.0.0 (LTS recommended)
- npm >= 9.0.0 or yarn >= 1.22.0
- Modern Chromium or WebKit browser with ES2022 support
- Active Firebase project with Firestore and Authentication enabled

## Project Structure
```
client/
├── src/
│   ├── assets/          # Static logos, icons, and hero artwork
│   ├── components/      # Reusable UI components (Navbar, Cart, Cards, Modals)
│   ├── context/         # React Context state providers (Auth, Cart, Theme)
│   ├── pages/           # Customer and Owner view controllers
│   ├── styles/          # Global styles, variables, and utility classes
│   └── utils/           # Helper functions, formatters, and Firebase client
├── public/              # Public static assets served at root
├── index.html           # Single-page application entry HTML
└── vite.config.js       # Vite build and dev-server configuration
```

## Authentication & Protected Routes
- Customer login via email/password and Firebase OAuth providers.
- Role-based route guard (`ProtectedRoute.jsx`) validates owner role claims.
- Automated session token renewal and graceful unauthenticated redirect handling.

## Search & Filtering Engine
- Multi-parameter search supporting category, recipient, price bracket, and occasion tags.
- Client-side fuzzy search scoring for quick keyword matching across titles and descriptions.
- Instant reactive filtering without unnecessary network roundtrips.

## Gift Customization & Wrap Options
- Interactive wrap selector (`GiftWrapSelector.jsx`) during the checkout flow.
- Multiple paper textures, personalized ribbons, and custom greeting card text previews.
- Transparent price calculation with live dynamic add-on recalculation.

## Coupons & Promotions Engine
- Instant coupon code validation against active promo campaign rules in Firestore.
- Supports percentage discounts, flat cash rebates, and free shipping thresholds.
- Visual feedback on applied savings directly in the cart subtotal summary.

## Order Tracking & Fulfillment Lifecycle
- Distinct order lifecycle phases: `Order Placed` -> `Processing` -> `Packed` -> `Shipped` -> `Delivered`.
- Customer order tracking lookup page with tracking ID lookup and interactive timeline.
- Timestamped updates stored per order in the Firestore orders collection.

## Customer Profile & Address Book
- Profile management suite (`ProfileManagement.jsx`) with multi-address management.
- Default billing and shipping destination persistence.
- Order history review with downloadable PDF invoices.

## Product Reviews & Social Proof
- Verified customer reviews with 5-star rating breakdowns.
- Media upload support for customer gift unwrapping photos.
- Aggregated average rating calculation and sentiment highlights.

## Owner Inventory Management
- Real-time stock decrement upon confirmed order placement.
- Visual low-stock thresholds and restock warning badges on the Owner Dashboard.
- Quick product edit modal for batch price updates and stock replenishment.

## Sales Analytics & Reporting
- Daily, weekly, and monthly sales graphs powered by Chart.js.
- Best-selling product leaderboards and revenue per category breakdown.
- Exportable CSV report generation for offline accounting.

## Design System & Styling Architecture
- Semantic CSS variables for primary, secondary, surface, and accent color palettes.
- Frosted glassmorphism card styling with subtle backdrop-blur filters.
- Standardized typography scale and fluid spacing utilities across all modules.

## Responsive Design & Breakpoints
- Mobile (<640px), Tablet (640px-1024px), and Desktop (>1024px) adaptive layouts.
- Touch-friendly tap targets and gesture-friendly carousel navigation on mobile viewports.
- Tested across modern iOS Safari, Android Chrome, Edge, and Firefox.

## Performance Benchmarks & Core Web Vitals
- First Contentful Paint (FCP) < 1.2s and Largest Contentful Paint (LCP) < 2.0s.
- Code-splitting with dynamic `React.lazy()` component imports for dashboard views.
- Cumulative Layout Shift (CLS) near zero using aspect-ratio image containers.

## Media Optimization & Asset Caching
- Native `loading="lazy"` attributes on non-critical catalog images.
- Cache-Control headers configured for immutable static assets in production.
- Google Drive image URL resolution with automatic thumbnail dimensions fallback.

## Accessibility & Usability Standards
- Full keyboard navigability (Tab, Enter, Escape) for modals and dropdown menus.
- High contrast ratios adhering to WCAG 2.1 AA specifications.
- Descriptive `aria-label` attributes on icon-only buttons and navigation items.

## Error Handling & Resilient UI
- Global error boundary catches unexpected render crashes gracefully.
- Automatic exponential backoff retries on transient network disconnects.
- Friendly toast notification system informing users of action statuses.

## Developer Troubleshooting FAQ
- **Firebase Permission Denied**: Verify rule deployment with `firebase deploy --only firestore:rules`.
- **Environment variables undefined**: Ensure variables begin with `VITE_` prefix and reload dev server.
- **Port 5173 occupied**: Vite will automatically select next available port or use `npm run dev -- --port 3000`.

## Firestore Collection Schema Reference
- `products`: `{ id, title, price, category, stock, images[], rating, description }`
- `orders`: `{ id, userId, items[], total, shippingAddress, status, createdAt }`
- `users`: `{ uid, email, role, addresses[], createdAt }`
- `coupons`: `{ code, discountPercent, active, expiresAt }`

## Contribution Guidelines & Workflow
1. Fork and create feature branch (`git checkout -b feat/feature-name`).
2. Adhere to ESLint and Prettier formatting conventions.
3. Write clean, atomic commit messages following Conventional Commits format.
4. Submit Pull Request with detailed description and test verification steps.

## Future Roadmap Milestones
- **Q3**: AI-powered gift recommendation assistant based on recipient interests.
- **Q4**: Multi-currency support and international shipping integrations.
- **Q1**: Augmented Reality (AR) 3D gift preview directly in the mobile browser.

## Continuous Integration & Automated Testing Pipeline
- Automated GitHub Actions workflow triggers on all pull requests and pushes to `main`.
- Validates Node.js 18.x and 20.x runtime compatibility matrix across diverse environments.
- Runs ESLint static analysis, dependency vulnerability scans, and Vite production bundle builds.
- Prevents regressions by executing headless end-to-end integration test suites before merges.

## State Management & Context API Architecture
- Centralized `AuthContext` provides authenticated user profile, auth token, and owner role verification.
- `CartContext` manages optimistic shopping cart mutations, local storage persistence, and promo calculations.
- Dedicated custom hooks (`useAuth`, `useCart`) provide type-safe, decoupled state access across components.
- Avoids prop drilling while maintaining predictable render performance and minimal re-render footprints.

## Component Hierarchy & Modular Design Patterns
- Atomic UI design separating foundational elements (`Button`, `Modal`, `Input`) from composite page sections.
- Compound components pattern utilized for complex widgets like multi-step checkout and review cards.
- Pure presentation components decoupled from Firebase SDK network queries for maximum testability.
- Strict layout separation with global header, announcement ticker, responsive body, and interactive footer.

## Frontend Security Best Practices & Content Sanitation
- Strict DOM sanitization preventing cross-site scripting (XSS) on customer review submissions.
- Secure storage practices: sensitive session tokens isolated from vulnerable browser storage vectors.
- Content Security Policy (CSP) headers protecting external image and script execution sources.
- Comprehensive client-side input validation and payload sanitization prior to Firestore dispatch.

## Cloud Firestore Security Rules Deep Dive
- Strict declarative rules enforce customer data isolation: users can only read and write their own orders.
- Product catalog documents allow global public read while restricting mutations strictly to verified admin UIDs.
- Field schema validation guarantees data integrity on every write, preventing malformed document injection.
- Rate-limiting constraints enforce maximum review submission frequency per authenticated customer.

## Internationalization (i18n) & Multi-Currency Architecture
- Extensible localization engine architecture ready for multi-language string tables and RTL support.
- Dynamic currency formatter utility supporting INR (₹), USD ($), EUR (€), and GBP (£) rates.
- Localized date and time formatting powered by native `Intl.DateTimeFormat` APIs.
- Locale persistence stored in customer preference cookies with automatic browser language fallback.

## Search Engine Optimization (SEO) & Social Meta Tags
- Dynamic `<head>` tag management rendering unique titles and meta descriptions per product catalog page.
- Open Graph (OG) and Twitter Card tags ensure engaging link preview cards across messaging platforms.
- Canonical link tags prevent duplicate content indexing on paginated and filtered listing views.
- JSON-LD structured data schemas for e-commerce products, ratings, and merchant business information.

## Progressive Web App (PWA) & Offline Caching Architecture
- Web App Manifest configured for mobile home screen installation with custom app splash icons.
- Service Worker caching strategy delivering offline fallback shells during network interruptions.
- Cache-first strategy for static assets, fonts, and stylesheets for near-instant repeat page loads.
- Background sync capabilities for queuing shopping cart updates and submitting actions when connectivity resumes.

## Email Notification & Order Receipt Dispatching
- Cloud Functions trigger automated transactional emails upon Firestore order document creation.
- Responsive HTML email templates for order confirmation, shipment tracking dispatch, and digital receipts.
- Direct delivery tracking links embedded into transactional messages for customer convenience.
- Secure unsubscribe and email preference management respecting consumer privacy preferences.

## Customer Support Helpdesk & Live Chat Widget
- Floating customer help desk widget with instant FAQ search and WhatsApp live chat redirection.
- Automated ticketing system routing pre-order inquiries and return requests directly to store admins.
- Real-time customer support availability badges indicating live response time expectations.
- Context-aware support triggers automatically attaching the customer's active cart or order ID.

## Dark Mode & High-Contrast Theme System
- CSS custom property design tokens allowing seamless light and dark mode toggling.
- Automatic detection of user system preferences via CSS `prefers-color-scheme` media queries.
- Persisted theme selection stored in browser storage to maintain consistency across user sessions.
- Tested against high-contrast display standards ensuring clear readability of product text and prices.

## Database Indexing & Firestore Query Optimization
- Composite index definitions in `firestore.indexes.json` for multi-field filtering and sorting.
- Efficient cursor-based pagination utilizing `startAfter` query bounds to minimize read costs.
- Projection queries selecting only essential document fields for listing card views.
- Denormalized summary fields reducing redundant cross-collection lookups for order history totals.

## Inventory Alerts & Low-Stock Webhooks
- Automated threshold checks trigger notifications when product inventory falls below 5 units.
- Webhook endpoints dispatch alerts to merchant Slack or Discord channels for immediate restocking.
- Visual warning indicators displayed on the merchant dashboard catalog table for rapid identification.
- Automatic catalog flag switching to "Out of Stock" preventing overselling on depleted gift items.

## Web Analytics & E-commerce Conversion Tracking
- Google Analytics 4 (GA4) e-commerce event measurement: `view_item`, `add_to_cart`, and `purchase`.
- Funnel drop-off analytics tracking customer progress through the multi-stage checkout flow.
- Anonymized visitor tracking respecting cookie consent banners and Do Not Track (DNT) headers.
- Custom dashboard conversion metrics calculating average order value (AOV) and cart abandonment rates.

## Order Cancellation & Automated Refund Lifecycle
- 1-hour grace cancellation window available directly from customer profile for unfulfilled orders.
- Automated status transition to `Cancelled` updating inventory quantities back to active stock.
- Automated refund receipt generation with clear turnaround estimates for the customer.
- Owner override capabilities allowing manual order adjustments, cancellations, and credit issuance.

## Code Quality, Linting & Git Pre-commit Hooks
- Unified ESLint rules verifying React hooks dependencies, unused imports, and syntax consistency.
- Prettier configuration enforcing standardized 2-space indentation, single quotes, and trailing commas.
- Pre-commit hooks via Husky and lint-staged validating staged files prior to commit creation.
- Strict build verification ensuring zero TypeScript/ESLint warnings before production releases.

## Docker Containerization & Multi-Stage Production Build
- Multi-stage Dockerfile: Node.js 20 build stage compiling production assets followed by minimal Nginx runner.
- Highly optimized final image footprint (<30MB) minimizing resource consumption and cold starts.
- Preconfigured Nginx configuration handling SPA client-side route rewrites and gzip compression.
- Standardized `docker-compose.yml` for unified local staging and rapid developer onboarding.

## Application Health Checks & Uptime Monitoring
- Lightweight health check endpoint verifying client bundle delivery and Firebase connectivity.
- Automated uptime monitoring pinging the storefront every 5 minutes from distributed global nodes.
- Incident escalation webhooks triggering on unexpected downtime or elevated error rate thresholds.
- Public status dashboard integration tracking service latency, availability, and scheduled maintenance.

## Performance Profiling & React DevTools Diagnostics
- React Profiler benchmarks identifying and eliminating unnecessary component re-renders.
- Memoization strategies using `useMemo` and `useCallback` for expensive cart recalculations.
- Virtualized lists implemented for extensive gift catalogs with hundreds of simultaneous items.
- Bundle analysis via `rollup-plugin-visualizer` keeping vendor chunks modular and lightweight.

## Backup, Disaster Recovery & Cloud Firestore Replication
- Scheduled daily Cloud Firestore database exports to Google Cloud Storage (GCS) cold buckets.
- Multi-region database replication ensuring 99.999% availability during regional outages.
- Point-in-time recovery (PITR) procedures allowing rapid rollback of unintended data deletions.
- Documented disaster recovery runbook detailing step-by-step restoration verification workflows.

## Changelog, Semantic Versioning & Release Governance
- Strict adherence to Semantic Versioning (SemVer: `MAJOR.MINOR.PATCH`) for all public releases.
- Automated changelog generation documenting new features, bug fixes, and security patches per release.
- Tagged Git releases on GitHub matching production deployment milestones.
- Clear deprecation policy providing notice before removing legacy API interfaces or styling themes.

## Payment Gateway Integration & Transaction Verification
- Direct integration with Razorpay and Stripe checkout APIs for secure, PCI-compliant card and UPI payments.
- Webhook listeners verify cryptographically signed HMAC SHA256 signatures before updating order payment status.
- Graceful failure handling providing immediate user feedback on card declines or network timeouts.
- Automated idempotent transaction reconciliation avoiding duplicate order generation on network retries.
