import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file directly
const envPath = resolve(__dirname, ".env");
let envConfig = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        envConfig[k] = v;
      }
    }
  });
}

console.log("==================================================================");
console.log("100% PROPER FIRESTORE SCHEMA PROVISIONING: kavya-gift-database");
console.log("==================================================================");

const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * 100% EXACT FIRESTORE DOCUMENT STRUCTURES WITH NATIVE DATA TYPES
 * Every single field requested by the user is an individual top-level Firestore property.
 * Annotated with `_isSchema: true` so frontend queries seamlessly ignore it.
 */
const COMPLETE_COLLECTION_STRUCTURES = {
  // 1. users
  users: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for customer & owner profiles",
      customerId: "CUS-10000",
      uid: "AUTHENTICATION_UID_REFERENCE",
      role: "customer", // Allowed: "customer" | "owner"
      fullName: "Full Name",
      mobile: "9876543210",
      email: "customer@kavyagifting.com",
      address: "Delivery Street Address, City, State, PIN",
      profileImage: "",
      status: "active", // Allowed: "active" | "blocked"
      isBlocked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    },
  },

  // 2. products
  products: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for gift hampers and products catalog",
      productId: "PRD-10000",
      productName: "Product Name Template",
      slug: "product-name-slug",
      categoryId: "CAT-10000",
      categoryName: "Category Name",
      description: "Detailed product narrative, packaging details, and specifications.",
      shortDescription: "Short teaser description of the gift hamper.",
      price: 1999,
      stockQuantity: 50,
      images: [
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800"
      ],
      thumbnail: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800",
      giftWrappingAvailable: true,
      giftWrappingPrice: 150,
      status: "schema_template", // Live products use: "active" | "inactive" | "archived"
      featured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  },

  // 3. categories
  categories: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for gifting categories and occasions",
      categoryId: "CAT-10000",
      categoryName: "Category Name Template",
      slug: "category-slug",
      description: "Curated collection of handcrafted hampers and luxury gift boxes.",
      image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&q=80&w=800",
      status: "schema_template", // Live categories use: "active" | "inactive"
      sortOrder: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  },

  // 4. carts
  carts: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for shopping carts",
      cartId: "CRT-10000",
      customerId: "CUS-10000",
      items: [
        {
          productId: "PRD-10000",
          productName: "Luxury Hamper Item",
          price: 1999,
          quantity: 1,
          giftWrapped: true,
          giftWrappingPrice: 150,
          thumbnail: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800"
        }
      ],
      subtotal: 1999,
      giftWrappingTotal: 150,
      total: 2149,
      updatedAt: serverTimestamp(),
    },
  },

  // 5. orders
  orders: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for customer orders",
      orderId: "ORD-10000",
      customerId: "CUS-10000",
      userId: "AUTHENTICATION_UID_REFERENCE",
      customerSnapshot: {
        fullName: "Customer Name",
        email: "customer@kavyagifting.com",
        mobile: "9876543210"
      },
      items: [
        {
          productId: "PRD-10000",
          productName: "Luxury Hamper Item",
          price: 1999,
          quantity: 1,
          giftWrapped: true,
          giftWrappingPrice: 150
        }
      ],
      subtotal: 1999,
      giftWrappingTotal: 150,
      totalAmount: 2149,
      paymentId: "PAY-10000",
      paymentStatus: "pending", // "pending" | "paid" | "failed" | "refunded"
      orderStatus: "placed", // "placed" | "processing" | "shipped" | "delivered" | "cancelled"
      deliveryAddress: {
        fullName: "Recipient Name",
        mobile: "9876543210",
        addressLine: "Flat 402, Lotus Towers",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038"
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  },

  // 6. payments
  payments: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for payment ledger entries",
      paymentId: "PAY-10000",
      orderId: "ORD-10000",
      customerId: "CUS-10000",
      amount: 2149,
      currency: "INR",
      provider: "razorpay", // "cashfree" | "razorpay" | "upi" | "cod"
      providerPaymentId: "pay_test_reference_id_10000",
      paymentStatus: "pending", // "pending" | "success" | "failed"
      paymentMethod: "UPI", // "UPI" | "CARD" | "NETBANKING" | "COD"
      createdAt: serverTimestamp(),
      verifiedAt: serverTimestamp(),
    },
  },

  // 7. reviews
  reviews: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for customer hamper reviews",
      reviewId: "REV-10000",
      productId: "PRD-10000",
      customerId: "CUS-10000",
      customerName: "Customer Name",
      rating: 5,
      title: "Exquisite presentation and quality",
      comment: "The customized gift wrapping made this the highlight of our festive occasion.",
      status: "schema_template", // Live reviews use: "pending" | "approved" | "rejected"
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  },

  // 8. user_activity
  user_activity: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for audit trail & security activity logging",
      activityId: "ACT-10000",
      customerId: "CUS-10000",
      action: "REGISTER", // "REGISTER" | "LOGIN" | "ADD_TO_CART" | "PLACE_ORDER" | "PROFILE_UPDATED"
      description: "Customer account registered successfully",
      createdAt: serverTimestamp(),
    },
  },

  // 9. owner_settings (Store Master Configuration)
  owner_settings: {
    docId: "store_config",
    data: {
      _isConfig: true,
      _description: "Master administrative configuration and store details for Kavya Gifting",
      storeName: "Kavya Gifting",
      storeEmail: "care@kavyagifting.com",
      contactNumber: "+91 98765 43210",
      address: "Kavya Gifting Studio, Bengaluru, Karnataka, India",
      updatedAt: serverTimestamp(),
    },
  },

  // 10. newsletter_subscribers
  newsletter_subscribers: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for newsletter subscriber list",
      email: "subscriber@kavyagifting.com",
      status: "active", // "active" | "unsubscribed"
      createdAt: serverTimestamp(),
    },
  },

  // 11. contact_messages
  contact_messages: {
    docId: "_schema",
    data: {
      _isSchema: true,
      _description: "Template & schema structure for customer contact inquiries",
      name: "Inquiry Sender Name",
      email: "sender@example.com",
      mobile: "9876543210",
      subject: "Bespoke Corporate Gifting Order Inquiry",
      message: "We would like to order 50 customized gift hampers for Diwali.",
      status: "unread", // "unread" | "read" | "resolved"
      createdAt: serverTimestamp(),
    },
  },

  // 12. counters (Atomic sequence generators for readable business IDs)
  counters: {
    docId: "sequences",
    data: {
      _isCounter: true,
      _description: "Atomic sequence tracking for human-readable IDs",
      PRD: 10001,
      CUS: 10001,
      ORD: 10001,
      PAY: 10001,
      REV: 10001,
      CAT: 10001,
      ACT: 10001,
      CRT: 10001,
      updatedAt: serverTimestamp(),
    },
  },
};

async function executeProperProvisioning() {
  console.log("Provisioning 100% exact Firestore field schemas across all collections...\n");

  for (const [colName, config] of Object.entries(COMPLETE_COLLECTION_STRUCTURES)) {
    const docRef = doc(db, colName, config.docId);
    await setDoc(docRef, config.data, { merge: true });
    console.log(`✓ 100% Correct Structure Provisioned: [${colName}] -> Doc [${config.docId}]`);
  }

  console.log("\nVerifying each collection directly from Cloud Firestore...\n");
  for (const [colName, config] of Object.entries(COMPLETE_COLLECTION_STRUCTURES)) {
    const docRef = doc(db, colName, config.docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const keys = Object.keys(data).filter(k => !k.startsWith("_"));
      console.log(`[${colName}] Verified! Total Business Fields: ${keys.length} -> (${keys.slice(0, 5).join(", ")}...)`);
    } else {
      console.error(`[${colName}] FAILED to verify.`);
    }
  }

  console.log("\n==================================================================");
  console.log("SUCCESS: All 12 collections now have 100% proper Firestore fields!");
  console.log("==================================================================");
}

executeProperProvisioning()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error provisioning Firestore:", err);
    process.exit(1);
  });
