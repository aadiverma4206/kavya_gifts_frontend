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

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Real-time listener on user profile document users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserProfile(data);
            } else {
              // Fallback if profile document is being created
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
              setUserProfile(prof);
              setLoading(false);
            });
          }
        );
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
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
    return await executeOwnerLogin(email, password);
  };

  const handleLogout = async () => {
    await logoutUser();
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
