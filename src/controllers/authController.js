import {
  registerCustomer,
  loginUser,
  logoutUser,
  resetCustomerPassword,
  getUserProfile,
} from "../services/authService.js";
import { validateCaptcha } from "../utils/captcha.js";

/**
 * Controller for Customer & Owner Authentication.
 * Implements MVC logic: validation, business policies, role/status verification,
 * and error handling before dispatching to services and view components.
 */

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Validates Step 1 of Customer Registration.
 * @param {Object} data - { fullName, mobile, email, address }
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateRegistrationStep1(data) {
  const { fullName = "", mobile = "", email = "", address = "" } = data;

  if (!fullName.trim() || fullName.trim().length < 2) {
    return { isValid: false, error: "Please enter your Full Name (minimum 2 characters)." };
  }

  const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
  if (!MOBILE_REGEX.test(cleanMobile)) {
    return { isValid: false, error: "Please enter a valid 10-digit Indian Mobile Number." };
  }

  if (!email.trim() || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return { isValid: false, error: "Please enter a valid Email address." };
  }

  if (!address.trim() || address.trim().length < 5) {
    return { isValid: false, error: "Please enter a complete delivery address (street, city, pincode)." };
  }

  return { isValid: true, error: null };
}

/**
 * Validates Step 2 of Customer Registration.
 * @param {Object} data - { password, confirmPassword, captchaInput, actualCaptcha }
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateRegistrationStep2(data) {
  const { password = "", confirmPassword = "", captchaInput = "", actualCaptcha = "" } = data;

  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match. Please re-enter." };
  }

  if (!captchaInput || !actualCaptcha || !validateCaptcha(captchaInput, actualCaptcha)) {
    return { isValid: false, error: "Incorrect Captcha code. Please try again." };
  }

  return { isValid: true, error: null };
}

/**
 * Orchestrates multi-step Customer Registration.
 * Ensures all Step 1 and Step 2 fields are validated before user creation.
 * Passwords are NEVER written to Firestore.
 */
export async function executeCustomerRegistration(step1Data, step2Data) {
  // Enforce Step 1 validation
  const step1Check = validateRegistrationStep1(step1Data);
  if (!step1Check.isValid) {
    throw new Error(step1Check.error);
  }

  // Enforce Step 2 validation
  const step2Check = validateRegistrationStep2(step2Data);
  if (!step2Check.isValid) {
    throw new Error(step2Check.error);
  }

  const cleanMobile = step1Data.mobile.replace(/\D/g, "").slice(-10);

  // Invoke model/service layer
  const result = await registerCustomer({
    fullName: step1Data.fullName.trim(),
    mobile: cleanMobile,
    email: step1Data.email.trim().toLowerCase(),
    address: step1Data.address.trim(),
    password: step2Data.password,
  });

  return result;
}

/**
 * Orchestrates Customer Login with role & blocked-status verification.
 * Automatically signs out and throws if user is blocked or suspended.
 */
export async function executeCustomerLogin(email, password) {
  if (!email || !email.trim()) {
    throw new Error("Please enter your registered email address.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  // 1. Authenticate with Firebase
  const { user, profile } = await loginUser(email, password);

  // 2. Fetch or verify latest Firestore profile
  let latestProfile = profile;
  if (!latestProfile) {
    latestProfile = await getUserProfile(user.uid);
  }

  // 3. Verify blocked status
  if (latestProfile?.isBlocked === true || latestProfile?.status === "blocked") {
    // Immediately terminate session to prevent application access
    await logoutUser();
    const blockedErr = new Error(
      "Your account has been suspended by store administration. Please contact care@kavyagifting.com."
    );
    blockedErr.code = "ACCOUNT_BLOCKED";
    throw blockedErr;
  }

  // 4. Role routing decision
  const isOwner = latestProfile?.role === "owner";
  return {
    user,
    profile: latestProfile,
    redirectPath: isOwner ? "/owner/dashboard" : "/dashboard",
  };
}

/**
 * Orchestrates Owner Login with strict role verification.
 * Rejects any non-owner account and signs them out immediately.
 */
export async function executeOwnerLogin(email, password) {
  if (!email || !email.trim()) {
    throw new Error("Please enter your owner administrator email.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  // 1. Authenticate with Firebase
  const { user, profile } = await loginUser(email, password);

  // 2. Retrieve Firestore document to verify role
  let latestProfile = profile;
  if (!latestProfile) {
    latestProfile = await getUserProfile(user.uid);
  }

  // 3. Enforce Owner Role Check
  if (latestProfile?.role !== "owner") {
    // Immediately log out unauthorized user
    await logoutUser();
    const forbiddenErr = new Error(
      "Access Restricted: This account does not possess Owner permissions."
    );
    forbiddenErr.code = "ACCESS_DENIED";
    throw forbiddenErr;
  }

  return {
    user,
    profile: latestProfile,
    redirectPath: "/owner/dashboard",
  };
}

/**
 * Handles password reset for customers via Firebase Auth email workflow.
 * Note: Owner password changes are explicitly disabled from client-side workflows.
 */
export async function executePasswordReset(email) {
  if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    throw new Error("Please enter a valid registered email address.");
  }

  await resetCustomerPassword(email.trim().toLowerCase());
  return { success: true, message: "Password reset link sent to your email. Check your inbox." };
}
