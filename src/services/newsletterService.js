import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const NEWSLETTER_COLLECTION = "newsletter_subscribers";

/**
 * Subscribes an email address to the newsletter.
 * Stores in the `newsletter_subscribers` collection.
 */
export async function subscribeNewsletter(email) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }

  // Use base64 or encoded email or sanitized email as document ID to naturally avoid duplicate documents
  const docId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
  const docRef = doc(db, NEWSLETTER_COLLECTION, docId);

  await setDoc(
    docRef,
    {
      email: cleanEmail,
      status: "active",
      subscribedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true, email: cleanEmail };
}
