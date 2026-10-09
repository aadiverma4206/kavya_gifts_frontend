import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import * as fs from "fs";
import { DUMMY_PRODUCTS } from "./src/data/dummyProducts.js";

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

console.log("=================================================");
console.log(`SEEDING ${DUMMY_PRODUCTS.length} DUMMY PRODUCTS TO CLOUD FIRESTORE`);
console.log("=================================================\n");

async function seedProducts() {
  const batch = writeBatch(db);
  let count = 0;

  for (const p of DUMMY_PRODUCTS) {
    const docRef = doc(db, "products", p.productId);
    const data = {
      productId: p.productId,
      productName: p.productName,
      slug: p.slug,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      description: p.description,
      shortDescription: p.shortDescription,
      price: p.price,
      stockQuantity: p.stockQuantity,
      images: p.images,
      thumbnail: p.thumbnail,
      giftWrappingAvailable: p.giftWrappingAvailable,
      giftWrappingPrice: p.giftWrappingPrice,
      status: "active",
      featured: p.featured,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Legacy aliases
      product_id: p.productId,
      product_name: p.productName,
      image_url: p.thumbnail,
      stock_qty: p.stockQuantity,
      category: p.categoryName,
    };
    batch.set(docRef, data, { merge: true });
    count++;
  }

  console.log(`Committing batch write of ${count} products...`);
  await batch.commit();
  console.log(`✓ SUCCESS! All ${count} products seeded into Firestore!`);
}

seedProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error during seeding:", err);
    process.exit(1);
  });
