import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (typeof process !== "undefined" ? process.env : {}) ||
  {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAEjEiOJkhLWmxYErO8muAxXxA9XIxOa94",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "kavya-gift-database.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "kavya-gift-database",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "kavya-gift-database.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1019441425461",
  appId: env.VITE_FIREBASE_APP_ID || "1:1019441425461:web:020c5e04c8b3054a03157c",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-FMM61V0ST5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;

