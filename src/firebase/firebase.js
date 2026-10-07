import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const env = (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" ? process.env : {}) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForTesting",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "kavya-gift-database.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "kavya-gift-database",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "kavya-gift-database.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEF",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
