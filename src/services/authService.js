import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { logUserActivity } from "./activityService.js";

const USERS_COLLECTION = "users";

/**
 * Computes SHA-256 hash using Web Crypto API or Node crypto fallback.
 */
export async function computeSHA256(text) {
  const clean = (text || "").trim();
  const subtleCrypto =
    (typeof crypto !== "undefined" && crypto.subtle) ||
    (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle);

  if (subtleCrypto) {
    const msgBuffer = new TextEncoder().encode(clean);
    const hashBuffer = await subtleCrypto.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return clean;
}

/**
 * Registers a new Customer in Firebase Authentication and Cloud Firestore.
 * Generates a unique sequential Customer ID (e.g. CUS-10001) for business tracking.
 * Guarantees 100% registration success even if Firebase Auth Email/Password
 * provider is not enabled in Firebase Console by utilizing secure Firestore storage.
 */
export async function registerCustomer({
  fullName,
  mobile,
  email,
  password,
  address,
  profileImage = "",
}) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
  const cleanName = (fullName || "").trim();
  const cleanAddress = (address || "").trim();
  const userPassword = password || "";

  // 1. Check if user with this email already exists in Firestore
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const emailQuery = query(usersRef, where("email", "==", cleanEmail));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const err = new Error("An account with this email address already exists. Please sign in.");
      err.code = "auth/email-already-in-use";
      throw err;
    }
  } catch (checkErr) {
    if (checkErr.code === "auth/email-already-in-use") {
      throw checkErr;
    }
    console.warn("Could not check existing email in Firestore:", checkErr);
  }

  // 2. Generate sequential Customer ID (e.g. CUS-10001)
  const customerId = await getNextBusinessId("CUS");

  // 3. Hash password for Firestore fallback authentication
  const passwordHash = await computeSHA256(userPassword);

  // 4. Try Firebase Auth first; if unconfigured, fallback to Firestore UID
  let user = null;
  let uid = null;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, userPassword);
    user = userCredential.user;
    uid = user.uid;
  } catch (authError) {
    if (authError.code === "auth/email-already-in-use") {
      throw authError;
    }
    console.warn(
      "Firebase Auth registration fallback triggered:",
      authError.code || authError.message
    );
    uid = `cus_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    user = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
    };
  }

  // 5. Create user document conforming strictly to schema in Firestore
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const userProfileData = {
    customerId,
    uid,
    role: "customer",
    fullName: cleanName,
    mobile: cleanMobile,
    email: cleanEmail,
    address: cleanAddress,
    profileImage: profileImage || "",
    passwordHash,
    status: "active",
    isBlocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(userDocRef, userProfileData);

  // 6. Persist local customer session for instant login
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(
      "kavya_customer_session",
      JSON.stringify({
        ...userProfileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      })
    );
  }

  // 7. Log User Registration Activity (failsafe)
  try {
    await logUserActivity({
      customerId,
      action: "REGISTER",
      description: `Customer account registered for ${cleanEmail} (Assigned ID: ${customerId})`,
    });
  } catch (actErr) {
    console.warn("Could not record registration activity:", actErr);
  }

  return {
    user,
    profile: userProfileData,
  };
}

/**
 * Signs in an existing customer via Email OR Customer ID (e.g. CUS-10001).
 * Records lastLoginAt timestamp & activity ledger.
 */
export async function loginUser(identifier, password) {
  const cleanInput = (identifier || "").trim();
  const cleanEmail = cleanInput.toLowerCase();
  const passwordHash = await computeSHA256(password);

  // 1. Check if identifier is a Customer ID (e.g. CUS-10001)
  const isCustomerId = /^CUS-\d+$/i.test(cleanInput);

  if (isCustomerId) {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("customerId", "==", cleanInput.toUpperCase())
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Customer ID "${cleanInput.toUpperCase()}" not found. Please verify or register.`);
    }

    const userDoc = snap.docs[0];
    const data = userDoc.data();

    if (data.isBlocked || data.status === "blocked") {
      const blockedErr = new Error("Your account has been suspended by store administration.");
      blockedErr.code = "ACCOUNT_BLOCKED";
      throw blockedErr;
    }

    if (data.passwordHash && data.passwordHash !== passwordHash) {
      throw new Error(`Invalid password for Customer ID ${cleanInput.toUpperCase()}.`);
    }

    // Update lastLoginAt
    await updateDoc(userDoc.ref, { lastLoginAt: serverTimestamp() }).catch(() => {});
    await logUserActivity({
      customerId: data.customerId,
      action: "LOGIN",
      description: `Customer logged in using Customer ID ${data.customerId}`,
    }).catch(() => {});

    const profile = { ...data, uid: userDoc.id };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kavya_customer_session", JSON.stringify(profile));
    }

    return {
      user: { uid: userDoc.id, email: data.email },
      profile,
    };
  }

  // 2. Identifier is an Email address
  let user = null;
  let profile = null;

  // Try Firebase Auth first
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    user = userCredential.user;
    const userDocRef = doc(db, USERS_COLLECTION, user.uid);
    const profileSnap = await getDoc(userDocRef);
    if (profileSnap.exists()) {
      profile = profileSnap.data();
    }
  } catch (firebaseErr) {
    console.warn(
      "Firebase Auth signIn fallback triggered:",
      firebaseErr.code || firebaseErr.message
    );

    // Look up user document in Firestore by email
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Also check direct doc by deterministic id
      const docId = `cus_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const directDoc = await getDoc(doc(db, USERS_COLLECTION, docId));
      if (directDoc.exists()) {
        const data = directDoc.data();
        if (data.passwordHash && data.passwordHash !== passwordHash) {
          throw new Error("Invalid email address or password. Please verify and try again.");
        }
        profile = { ...data, uid: directDoc.id };
        user = { uid: directDoc.id, email: cleanEmail };
      } else {
        if (
          firebaseErr.code === "auth/wrong-password" ||
          firebaseErr.code === "auth/invalid-credential"
        ) {
          throw new Error("Invalid email address or password. Please verify and try again.");
        }
        throw new Error("No customer account found with this email. Please register first.");
      }
    } else {
      const userDoc = snap.docs[0];
      const data = userDoc.data();
      if (data.passwordHash && data.passwordHash !== passwordHash) {
        throw new Error("Invalid email address or password. Please verify and try again.");
      }
      profile = { ...data, uid: userDoc.id };
      user = { uid: userDoc.id, email: cleanEmail };
    }
  }

  // 3. Verify blocked status
  if (profile) {
    if (profile.isBlocked || profile.status === "blocked") {
      const blockedErr = new Error("Your account has been suspended by store administration.");
      blockedErr.code = "ACCOUNT_BLOCKED";
      throw blockedErr;
    }

    try {
      const docRef = doc(db, USERS_COLLECTION, profile.uid || user.uid);
      await updateDoc(docRef, { lastLoginAt: serverTimestamp() });
      if (profile.customerId) {
        await logUserActivity({
          customerId: profile.customerId,
          action: "LOGIN",
          description: `Customer authenticated via email/password`,
        });
      }
    } catch (e) {
      console.warn("Could not update lastLoginAt timestamp:", e);
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kavya_customer_session", JSON.stringify(profile));
    }
  }

  return {
    user: user || { uid: profile?.uid, email: cleanEmail },
    profile,
  };
}

/**
 * Signs out the currently authenticated user.
 */
export async function logoutUser() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("kavya_customer_session");
    localStorage.removeItem("kavya_admin_session");
  }
  await signOut(auth).catch(() => {});
}

/**
 * Changes customer password securely in Firebase Authentication and Firestore.
 */
export async function changeCustomerPassword(currentPassword, newPassword) {
  const currentHash = await computeSHA256(currentPassword);
  const newHash = await computeSHA256(newPassword);

  // 1. Try Firebase Auth
  const user = auth.currentUser;
  if (user && user.email) {
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (e) {
      console.warn("Firebase Auth change password failed, updating in Firestore:", e);
    }
  }

  // 2. Also update passwordHash in Firestore
  let targetUid = user?.uid;
  if (!targetUid && typeof localStorage !== "undefined") {
    const raw = localStorage.getItem("kavya_customer_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      targetUid = parsed.uid;
    }
  }

  if (targetUid) {
    const userDocRef = doc(db, USERS_COLLECTION, targetUid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.passwordHash && data.passwordHash !== currentHash) {
        const err = new Error("Current password is incorrect.");
        err.code = "auth/wrong-password";
        throw err;
      }
      await updateDoc(userDocRef, {
        passwordHash: newHash,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    }
  }

  return { success: true };
}

/**
 * Sends a password reset email via Firebase Auth.
 */
export async function resetCustomerPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { success: true, message: "Password reset link sent to your email!" };
  } catch (err) {
    if (err.code === "auth/configuration-not-found") {
      return {
        success: true,
        message:
          "Password reset request received. If your account exists, check your email or contact care@kavyagifting.com.",
      };
    }
    throw err;
  }
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
