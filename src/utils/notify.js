import { toast } from "sonner";

/**
 * Parses technical errors (Firebase, Axios, fetch, Error) into friendly human messages.
 * @param {any} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getFriendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  const code = error.code || "";
  const msg = error.message || "";

  // Firebase Auth Error Codes
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password. Please check your credentials.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account with this email address already exists.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please choose at least 6 characters.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again in a few moments.";
  }
  if (code === "auth/network-request-failed" || msg.includes("network")) {
    return "Network error. Please check your internet connection.";
  }

  // Firestore or Permission errors
  if (code === "permission-denied" || msg.includes("permission-denied")) {
    return "You do not have permission to perform this action.";
  }

  return msg || fallback;
}

export const notify = {
  success: (message, options) => toast.success(message, options),
  error: (err, fallback = "An error occurred", options) => {
    const text = getFriendlyErrorMessage(err, fallback);
    toast.error(text, options);
  },
  info: (message, options) => toast.info(message, options),
  warning: (message, options) => toast.warning(message, options),
};

export default notify;
