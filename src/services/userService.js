import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

const USERS_COLLECTION = "users";

/**
 * Retrieves a user profile by UID from Firestore.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Creates or updates a user profile in Firestore.
 */
export async function saveUserProfile(uid, userData) {
  if (!uid) throw new Error("User ID is required.");
  const userRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(
    userRef,
    {
      ...userData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return { uid, ...userData };
}
