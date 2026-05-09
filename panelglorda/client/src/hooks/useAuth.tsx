import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { getDocData } from "@/lib/firestore";

interface User {
  id: string;
  email: string;
  name?: string;
  storeName?: string;
  ownerName?: string;
}

interface AuthContextType {
  user: User | null;
  userType: "merchant" | "admin" | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<"merchant" | "admin" | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (firebaseUid: string) => {
    // Read user doc to get role and extra info
    const userDoc = await getDocData<{
      role?: "merchant" | "admin";
      email?: string;
      name?: string;
      merchantId?: string;
    }>(`users/${firebaseUid}`);

    if (!userDoc || !userDoc.role) {
      setUser(null);
      setUserType(null);
      return;
    }

    if (userDoc.role === "merchant") {
      const merchantId = userDoc.merchantId || firebaseUid;
      const merchantDoc = await getDocData<{
        storeName?: string;
        ownerName?: string;
        status?: string;
      }>(`merchants/${merchantId}`);

      setUser({
        id: merchantId,
        email: userDoc.email || firebaseUser?.email || "",
        name: userDoc.name,
        storeName: merchantDoc?.storeName,
        ownerName: merchantDoc?.ownerName,
      });
      setUserType("merchant");
    } else {
      setUser({
        id: firebaseUid,
        email: userDoc.email || firebaseUser?.email || "",
        name: userDoc.name,
      });
      setUserType("admin");
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUserData) => {
      setFirebaseUser(firebaseUserData);

      if (firebaseUserData) {
        await fetchUser(firebaseUserData.uid);
      } else {
        setUser(null);
        setUserType(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setUserType(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userType,
      firebaseUser,
      isLoading,
      isAuthenticated: !!firebaseUser && !!userType,
      logout,
      refetch: () => firebaseUser ? fetchUser(firebaseUser.uid) : Promise.resolve()
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function ProtectedRoute({
  children,
  requiredRole
}: {
  children: ReactNode;
  requiredRole: "merchant" | "admin"
}) {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate(requiredRole === "admin" ? "/admin/login" : "/");
      } else if (userType !== requiredRole) {
        navigate(requiredRole === "admin" ? "/admin/login" : "/");
      }
    }
  }, [isAuthenticated, userType, isLoading, requiredRole, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || userType !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

