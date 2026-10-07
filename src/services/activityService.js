import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";

const ACTIVITY_COLLECTION = "user_activity";

/**
 * Logs customer/user activity event into Firestore.
 *
 * @param {Object} params
 * @param {string} params.customerId - Human-readable customer ID (e.g. CUS-10001)
 * @param {string} params.action - e.g. "LOGIN", "REGISTER", "ORDER_CREATED", "REVIEW_SUBMITTED"
 * @param {string} params.description - Human-readable context
 * @returns {Promise<Object>}
 */
export async function logUserActivity({ customerId, action, description = "" }) {
  if (!customerId || !action) return null;

  try {
    const activityId = await getNextBusinessId("ACT");
    const docRef = doc(db, ACTIVITY_COLLECTION, activityId);

    const payload = {
      activityId,
      customerId,
      action: action.toUpperCase(),
      description,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.warn("Failed to log user activity:", error);
    return null;
  }
}

/**
 * Retrieves activity logs for a specific customer.
 */
export async function getCustomerActivity(customerId) {
  if (!customerId) return [];
  try {
    const q = query(
      collection(db, ACTIVITY_COLLECTION),
      where("customerId", "==", customerId)
    );
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return logs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.warn("Could not query customer activity:", err);
    return [];
  }
}

/**
 * Owner portal: Retrieves all user activities across the store.
 */
export async function getAllActivitiesForOwner() {
  try {
    const snapshot = await getDocs(collection(db, ACTIVITY_COLLECTION));
    const logs = snapshot.docs
      .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
      .map((d) => ({ id: d.id, ...d.data() }));
    return logs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.warn("Could not query all activities:", err);
    return [];
  }
}
