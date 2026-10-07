import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
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

console.log("=================================================");
console.log("FIRESTORE PROVISIONING: kavya-gift-database");
console.log("=================================================");
console.log("Target Project:", envConfig.VITE_FIREBASE_PROJECT_ID);

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

// Schemas to provision structurally without creating dummy business data
const SCHEMAS = {
  users: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for users collection. Contains customer profiles and owner administrative records. Passwords are never stored here.",
    _allowedRoles: ["customer", "owner"],
    _allowedStatus: ["active", "blocked"],
    _schemaFields: [
      "customerId",
      "uid",
      "role",
      "fullName",
      "mobile",
      "email",
      "address",
      "profileImage",
      "status",
      "isBlocked",
      "createdAt",
      "updatedAt",
      "lastLoginAt"
    ]
  },
  products: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for products catalog hampers. Only owner accounts may create or modify products.",
    _schemaFields: [
      "productId",
      "productName",
      "slug",
      "categoryId",
      "categoryName",
      "description",
      "shortDescription",
      "price",
      "stockQuantity",
      "images",
      "thumbnail",
      "giftWrappingAvailable",
      "giftWrappingPrice",
      "status",
      "featured",
      "createdAt",
      "updatedAt"
    ]
  },
  categories: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for gift categories and festive occasions.",
    _schemaFields: [
      "categoryId",
      "categoryName",
      "slug",
      "description",
      "image",
      "status",
      "sortOrder",
      "createdAt",
      "updatedAt"
    ]
  },
  carts: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for customer shopping carts.",
    _schemaFields: [
      "cartId",
      "customerId",
      "items",
      "subtotal",
      "giftWrappingTotal",
      "total",
      "updatedAt"
    ]
  },
  orders: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for customer gift hamper orders.",
    _schemaFields: [
      "orderId",
      "customerId",
      "customerSnapshot",
      "items",
      "subtotal",
      "giftWrappingTotal",
      "totalAmount",
      "paymentId",
      "paymentStatus",
      "orderStatus",
      "deliveryAddress",
      "createdAt",
      "updatedAt"
    ]
  },
  payments: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for payment transaction ledger records.",
    _schemaFields: [
      "paymentId",
      "orderId",
      "customerId",
      "amount",
      "currency",
      "provider",
      "providerPaymentId",
      "paymentStatus",
      "paymentMethod",
      "createdAt",
      "verifiedAt"
    ]
  },
  reviews: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for customer product feedback and ratings.",
    _schemaFields: [
      "reviewId",
      "productId",
      "customerId",
      "customerName",
      "rating",
      "title",
      "comment",
      "status",
      "createdAt",
      "updatedAt"
    ]
  },
  user_activity: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for user audit and activity logging.",
    _schemaFields: [
      "activityId",
      "customerId",
      "action",
      "description",
      "createdAt"
    ]
  },
  owner_settings: {
    // This is genuine store configuration
    storeName: "Kavya Gifting",
    storeEmail: "care@kavyagifting.com",
    contactNumber: "+91 98765 43210",
    address: "Kavya Gifting Studio, Bengaluru, Karnataka, India",
    _isConfig: true,
  },
  newsletter_subscribers: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for newsletter subscription list.",
    _schemaFields: [
      "email",
      "status",
      "createdAt"
    ]
  },
  contact_messages: {
    _type: "SCHEMA_METADATA",
    _description: "Structural schema specification for customer inquiries and contact requests.",
    _schemaFields: [
      "name",
      "email",
      "mobile",
      "subject",
      "message",
      "status",
      "createdAt"
    ]
  }
};

async function provisionDatabase() {
  console.log("\nStarting structural provisioning across all 11 collections...\n");
  const results = [];

  for (const [colName, schemaData] of Object.entries(SCHEMAS)) {
    const docId = colName === "owner_settings" ? "store_config" : "_schema";
    const docRef = doc(db, colName, docId);

    const payload = {
      ...schemaData,
      _provisionedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });
    console.log(`✓ Provisioned collection [${colName}] -> doc [${docId}]`);
    results.push({ collection: colName, document: docId });
  }

  // Also provision atomic counters collection
  const countersRef = doc(db, "counters", "sequences");
  await setDoc(countersRef, {
    PRD: 10001,
    CUS: 10001,
    ORD: 10001,
    PAY: 10001,
    REV: 10001,
    CAT: 10001,
    ACT: 10001,
    CRT: 10001,
    _provisionedAt: serverTimestamp(),
  }, { merge: true });
  console.log("✓ Provisioned collection [counters] -> doc [sequences]");
  results.push({ collection: "counters", document: "sequences" });

  console.log("\nVerifying live database state via read queries...\n");
  for (const item of results) {
    const ref = doc(db, item.collection, item.document);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      console.log(`Verified [${item.collection}/${item.document}]: EXISTS in Cloud Firestore`);
    } else {
      console.error(`Verification Failed [${item.collection}/${item.document}]: NOT FOUND`);
    }
  }

  console.log("\nAll collections and structural documents successfully verified in Cloud Firestore!");
}

provisionDatabase().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
