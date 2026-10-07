import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { logUserActivity } from "./activityService.js";

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
 * Updates an authenticated customer's profile.
 */
export async function saveUserProfile(uid, userData) {
  if (!uid) throw new Error("User ID is required.");
  const userRef = doc(db, USERS_COLLECTION, uid);

  const payload = {
    ...userData,
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });

  if (userData.customerId) {
    await logUserActivity({
      customerId: userData.customerId,
      action: "PROFILE_UPDATED",
      description: "User profile details updated",
    });
  }

  return { uid, ...payload };
}

/**
 * Owner portal: Retrieves all registered users/customers.
 */
export async function getAllUsersForOwner() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }));
}

/**
 * Owner portal: Blocks or unblocks a customer.
 * Updates both `status` ("active" | "blocked") and `isBlocked` (boolean).
 */
export async function toggleBlockUser(uid, isBlocked) {
  if (!uid) throw new Error("User ID is required.");
  const userRef = doc(db, USERS_COLLECTION, uid);
  const nextStatus = isBlocked ? "blocked" : "active";

  await updateDoc(userRef, {
    status: nextStatus,
    isBlocked: Boolean(isBlocked),
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(userRef);
  const customerId = snap.exists() ? snap.data().customerId : null;
  if (customerId) {
    await logUserActivity({
      customerId,
      action: isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
      description: `Customer account ${isBlocked ? "suspended" : "restored"} by administrator`,
    });
  }

  return { uid, status: nextStatus, isBlocked: Boolean(isBlocked) };
}
