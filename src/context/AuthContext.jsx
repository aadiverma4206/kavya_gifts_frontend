import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  executeCustomerRegistration,
  executeCustomerLogin,
  executeOwnerLogin,
  executePasswordReset,
} from "../controllers/authController";
import { logoutUser, getUserProfile } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Restore persistent Admin Session if present
  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const savedAdmin = localStorage.getItem("kavya_admin_session");
        if (savedAdmin) {
          const parsed = JSON.parse(savedAdmin);
          if (parsed && parsed.role === "owner") {
            setCurrentUser({ uid: parsed.uid, email: parsed.email });
            setUserProfile(parsed);
            setLoading(false);
          }
        }
      }
    } catch (e) {
      console.warn("Could not restore saved admin session:", e);
    }
  }, []);

  // 2. Firebase Auth listener for customer sessions
  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Real-time listener on user profile document users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
            } else {
              setUserProfile({
                uid: user.uid,
                email: user.email,
                role: "customer",
                status: "active",
                isBlocked: false,
              });
            }
            setLoading(false);
          },
          (err) => {
            console.warn("Real-time profile listener error:", err);
            getUserProfile(user.uid).then((prof) => {
              if (prof) setUserProfile(prof);
              setLoading(false);
            });
          }
        );
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        // If not in a local admin session, clear profile
        if (typeof localStorage !== "undefined" && !localStorage.getItem("kavya_admin_session")) {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isOwner = userProfile?.role === "owner";
  const isCustomer = userProfile?.role === "customer" || (!isOwner && Boolean(currentUser));
  const isBlocked = Boolean(userProfile?.isBlocked || userProfile?.status === "blocked");

  // Actions dispatched via Controller
  const handleRegister = async (step1Data, step2Data) => {
    return await executeCustomerRegistration(step1Data, step2Data);
  };

  const handleCustomerLogin = async (email, password) => {
    return await executeCustomerLogin(email, password);
  };

  const handleOwnerLogin = async (email, password) => {
    const res = await executeOwnerLogin(email, password);
    setCurrentUser(res.user);
    setUserProfile(res.profile);
    return res;
  };

  const handleLogout = async () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("kavya_admin_session");
    }
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const handlePasswordReset = async (email) => {
    return await executePasswordReset(email);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isOwner,
    isCustomer,
    isBlocked,
    // Controller-backed actions
    register: handleRegister,
    loginCustomer: handleCustomerLogin,
    loginOwner: handleOwnerLogin,
    // Aliased login for backward compatibility
    login: async (email, password) => {
      return await executeCustomerLogin(email, password);
    },
    logout: handleLogout,
    resetPassword: handlePasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
