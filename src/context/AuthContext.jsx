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

  // Helper to get stored customer session
  const getStoredCustomerSession = () => {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("kavya_customer_session");
        return saved ? JSON.parse(saved) : null;
      }
    } catch (e) {
      console.warn("Could not parse saved customer session:", e);
    }
    return null;
  };

  // Helper to get stored admin session
  const getStoredAdminSession = () => {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("kavya_admin_session");
        return saved ? JSON.parse(saved) : null;
      }
    } catch (e) {
      console.warn("Could not parse saved admin session:", e);
    }
    return null;
  };

  // 1. Initial restoration of session from localStorage
  useEffect(() => {
    const adminSession = getStoredAdminSession();
    const customerSession = getStoredCustomerSession();

    if (adminSession && adminSession.role === "owner") {
      setCurrentUser({ uid: adminSession.uid, email: adminSession.email });
      setUserProfile(adminSession);
      setLoading(false);
    } else if (customerSession && customerSession.customerId) {
      setCurrentUser({ uid: customerSession.uid, email: customerSession.email });
      setUserProfile(customerSession);
      setLoading(false);
    }
  }, []);

  // 2. Firebase Auth and Firestore real-time profile listener
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
              const data = docSnap.data();
              // Check if customer account was blocked by owner
              if ((data.isBlocked === true || data.status === "blocked") && data.role === "customer") {
                if (typeof localStorage !== "undefined") {
                  localStorage.removeItem("kavya_customer_session");
                }
                logoutUser().catch(() => {});
                setCurrentUser(null);
                setUserProfile(data);
                setLoading(false);
                return;
              }

              setUserProfile(data);
              if (typeof localStorage !== "undefined" && data.role === "customer") {
                localStorage.setItem("kavya_customer_session", JSON.stringify(data));
              }
            } else {
              setUserProfile((prev) => prev || {
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

        // Check if customer or admin has active persistent local session
        const adminSession = getStoredAdminSession();
        const customerSession = getStoredCustomerSession();

        if (adminSession && adminSession.role === "owner") {
          setCurrentUser({ uid: adminSession.uid, email: adminSession.email });
          setUserProfile(adminSession);
        } else if (customerSession && customerSession.customerId) {
          setCurrentUser({ uid: customerSession.uid, email: customerSession.email });
          setUserProfile(customerSession);

          // Keep customer profile live with Firestore snapshot
          try {
            const userDocRef = doc(db, "users", customerSession.uid);
            unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const updated = snap.data();
                setUserProfile(updated);
                localStorage.setItem("kavya_customer_session", JSON.stringify(updated));
              }
            });
          } catch (e) {
            console.warn("Could not sync customer profile snapshot:", e);
          }
        } else {
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
    const res = await executeCustomerRegistration(step1Data, step2Data);
    if (res?.user && res?.profile) {
      setCurrentUser(res.user);
      setUserProfile(res.profile);
    }
    return res;
  };

  const handleCustomerLogin = async (identifier, password) => {
    const res = await executeCustomerLogin(identifier, password);
    if (res?.user && res?.profile) {
      setCurrentUser(res.user);
      setUserProfile(res.profile);
    }
    return res;
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
      localStorage.removeItem("kavya_customer_session");
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
    login: async (identifier, password) => {
      return await handleCustomerLogin(identifier, password);
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
