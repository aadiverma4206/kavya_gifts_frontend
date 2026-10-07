import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { logUserActivity } from "./activityService.js";

const USERS_COLLECTION = "users";

/**
 * Registers a new Customer in Firebase Authentication and creates their profile
 * document in the Cloud Firestore `users` collection.
 * Passwords are NEVER stored in Firestore.
 */
export async function registerCustomer({ fullName, mobile, email, address, profileImage = "" }) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, arguments[0].password);
  const user = userCredential.user;

  // 2. Generate sequential Customer ID (e.g. CUS-10001)
  const customerId = await getNextBusinessId("CUS");

  // 3. Create full user document conforming to schema
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userProfileData = {
    customerId,
    uid: user.uid,
    role: "customer",
    fullName: fullName.trim(),
    mobile: mobile.trim(),
    email: cleanEmail,
    address: address.trim(),
    profileImage: profileImage || "",
    status: "active",
    isBlocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(userDocRef, userProfileData);

  // 4. Log User Registration Activity
  await logUserActivity({
    customerId,
    action: "REGISTER",
    description: `Customer account registered for ${cleanEmail}`,
  });

  return {
    user,
    profile: userProfileData,
  };
}

/**
 * Signs in an existing user and records lastLoginAt timestamp & activity.
 */
export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const user = userCredential.user;

  // Fetch Firestore profile
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const profileSnap = await getDoc(userDocRef);
  let profile = profileSnap.exists() ? profileSnap.data() : null;

  // Update lastLoginAt
  if (profileSnap.exists()) {
    try {
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      });
      if (profile?.customerId) {
        await logUserActivity({
          customerId: profile.customerId,
          action: "LOGIN",
          description: `User authenticated via email password`,
        });
      }
    } catch (e) {
      console.warn("Could not update lastLoginAt timestamp:", e);
    }
  }

  return {
    user,
    profile,
  };
}

/**
 * Signs out the currently authenticated user.
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Changes customer password securely using Firebase Authentication.
 */
export async function changeCustomerPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user found.");
  }

  // Re-authenticate before allowing password change
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Update password in Firebase Auth
  await updatePassword(user, newPassword);
  return { success: true };
}

/**
 * Sends a password reset email via Firebase Auth.
 */
export async function resetCustomerPassword(email) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  return { success: true };
}

/**
 * Retrieves the profile of a given user UID from Firestore.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) return null;
  return snap.data();
}
