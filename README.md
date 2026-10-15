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
