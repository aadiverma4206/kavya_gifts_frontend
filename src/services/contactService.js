import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";

const CONTACT_COLLECTION = "contact_messages";

/**
 * Submits a contact inquiry to Cloud Firestore.
 */
export async function sendContactMessage({ name, email, phone = "", message }) {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanMessage = (message || "").trim();

  if (!cleanName || !cleanEmail || !cleanMessage) {
    throw new Error("Name, email, and message are required.");
  }

  const docRef = await addDoc(collection(db, CONTACT_COLLECTION), {
    name: cleanName,
    email: cleanEmail,
    phone: (phone || "").trim(),
    message: cleanMessage,
    status: "unread",
    createdAt: serverTimestamp(),
  });

  return { success: true, id: docRef.id };
}
