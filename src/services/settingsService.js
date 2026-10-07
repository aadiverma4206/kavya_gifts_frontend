import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

const SETTINGS_COLLECTION = "owner_settings";
const GENERAL_DOC_ID = "general";

const DEFAULT_SETTINGS = {
  storeName: "Kavya Gifting",
  storeEmail: "care@kavyagifting.com",
  contactNumber: "+91 98765 43210",
  address: "Boutique Studio, New Delhi, India",
};

/**
 * Retrieves store configuration and owner settings.
 */
export async function getOwnerSettings() {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (error) {
    console.warn("Could not fetch owner settings, using defaults:", error);
  }
  return { id: GENERAL_DOC_ID, ...DEFAULT_SETTINGS };
}

/**
 * Owner portal: Updates store settings.
 */
export async function updateOwnerSettings(settings) {
  const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
  const payload = {
    storeName: settings.storeName || DEFAULT_SETTINGS.storeName,
    storeEmail: settings.storeEmail || DEFAULT_SETTINGS.storeEmail,
    contactNumber: settings.contactNumber || DEFAULT_SETTINGS.contactNumber,
    address: settings.address || DEFAULT_SETTINGS.address,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  return { id: GENERAL_DOC_ID, ...payload };
}
