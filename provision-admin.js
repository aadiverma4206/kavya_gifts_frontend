import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import * as crypto from "crypto";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, ".env");
let envConfig = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        envConfig[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
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

function hashPassword(password) {
  return crypto.createHash("sha256").update(password.trim()).digest("hex");
}

async function provisionBoth() {
  const email = "kavyachakradhari711@gmail.com";
  const password = "Admin@1234";
  const passwordHash = hashPassword(password);
  const docId = email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");

  // 1. Provision admins collection
  const adminRef = doc(db, "admins", docId);
  const adminData = {
    adminId: "ADM-10001",
    email: email.toLowerCase(),
    role: "owner",
    fullName: "Kavya Chakradhari (Store Owner)",
    mobile: "+91 98765 43210",
    status: "active",
    passwordHash: passwordHash,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };
  await setDoc(adminRef, adminData, { merge: true });
  console.log("✓ Provisioned admins collection doc:", docId);

  // 2. Also provision users collection with owner role
  const userRef = doc(db, "users", docId);
  const userData = {
    customerId: "ADM-10001",
    uid: docId,
    role: "owner",
    fullName: "Kavya Chakradhari (Store Owner)",
    mobile: "+91 98765 43210",
    email: email.toLowerCase(),
    address: "Kavya Gifting Studio, Bengaluru, India",
    profileImage: "",
    status: "active",
    isBlocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };
  await setDoc(userRef, userData, { merge: true });
  console.log("✓ Provisioned users collection doc:", docId);
}

provisionBoth().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
