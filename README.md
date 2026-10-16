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
