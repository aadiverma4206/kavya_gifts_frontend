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
 * Computes SHA-256 hash using the Web Crypto API.
 */
export async function computeSHA256(text) {
  const clean = (text || "").trim();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(clean);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return clean;
}

/**
 * Dedicated Owner Login:
 * Authenticates against the dedicated `admins` collection in Cloud Firestore.
 * Supports kavyachakradhari711@gmail.com with secure SHA-256 credential verification.
 */
export async function loginOwnerAccount(email, password) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const docId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");

  // 1. Verify credentials against dedicated `admins` collection in Firestore
  const adminRef = doc(db, "admins", docId);
  const snap = await getDoc(adminRef);

  if (snap.exists()) {
    const adminData = snap.data();
    const inputHash = await computeSHA256(password);

    if (adminData.passwordHash && adminData.passwordHash !== inputHash) {
      throw new Error("Invalid administrative password.");
    }

    if (adminData.role !== "owner") {
      throw new Error("Access Denied: Account does not have owner permissions.");
    }

    // Update lastLoginAt in Firestore
    try {
      await updateDoc(adminRef, {
        lastLoginAt: serverTimestamp(),
      });
      await logUserActivity({
        customerId: adminData.adminId || "ADM-10001",
        action: "OWNER_LOGIN",
        description: `Owner ${cleanEmail} authenticated via admin portal`,
      });
    } catch (e) {
      console.warn("Could not record admin activity:", e);
    }

    const sessionData = {
      uid: adminData.adminId || docId,
      email: cleanEmail,
      role: "owner",
      fullName: adminData.fullName || "Kavya Chakradhari (Owner)",
      status: "active",
      customerId: adminData.adminId || "ADM-10001",
    };

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kavya_admin_session", JSON.stringify(sessionData));
    }

    return {
      user: { uid: sessionData.uid, email: cleanEmail },
      profile: sessionData,
    };
  }

  // 2. Fallback to Firebase Authentication
  try {
    const res = await loginUser(cleanEmail, password);
    return res;
  } catch (err) {
    if (err.code === "auth/configuration-not-found") {
      throw new Error(
        "Admin not found in 'admins' collection and Firebase Auth Email/Password is not enabled in Firebase Console. Please verify credentials."
      );
    }
    throw err;
  }
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
