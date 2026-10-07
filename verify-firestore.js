import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

console.log("Firebase Project ID from .env:", envConfig.VITE_FIREBASE_PROJECT_ID);

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

const COLLECTIONS = [
  "users",
  "products",
  "categories",
  "carts",
  "orders",
  "payments",
  "reviews",
  "user_activity",
  "owner_settings",
  "newsletter_subscribers",
  "contact_messages"
];

async function inspect() {
  console.log("Inspecting Cloud Firestore database...");
  for (const colName of COLLECTIONS) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`- Collection [${colName}]: ${snapshot.empty ? "EMPTY" : `${snapshot.size} documents`}`);
    } catch (err) {
      console.log(`- Collection [${colName}]: Error -> ${err.code || err.message}`);
    }
  }
}

inspect().then(() => {
  console.log("Inspection complete.");
  process.exit(0);
}).catch((err) => {
  console.error("Fatal error during inspection:", err);
  process.exit(1);
});
