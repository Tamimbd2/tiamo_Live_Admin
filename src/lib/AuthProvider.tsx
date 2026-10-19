import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        const adminRef = doc(db, "admins", currentUser.uid);
        const adminDoc = await getDoc(adminRef);
        
        if (adminDoc.exists()) {
          setRole(adminDoc.data().role);
          
          // Update lastLoginAt if it was more than 1 minute ago to avoid document write spam
          const data = adminDoc.data();
          let shouldUpdate = true;
          if (data.lastLoginAt) {
            const lastLoginDate = typeof data.lastLoginAt.toDate === "function"
              ? data.lastLoginAt.toDate()
              : new Date(data.lastLoginAt);
            
            if (Date.now() - lastLoginDate.getTime() < 60000) {
              shouldUpdate = false;
            }
          }
          
          if (shouldUpdate) {
            try {
              await updateDoc(adminRef, {
                lastLoginAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Error updating lastLoginAt:", err);
            }
          }
        } else {
          // Document does not exist, create it with requested fields
          try {
            const name = currentUser.email ? currentUser.email.split("@")[0] : "admin";
            await setDoc(adminRef, {
              uid: currentUser.uid,
              name: name,
              email: currentUser.email || "",
              phone: "",
              role: "mother_panel",
              isActive: true,
              createdBy: "auto",
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            });
            setRole("mother_panel");
          } catch (err) {
            console.error("Error auto-creating admin doc:", err);
            setRole(null);
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
