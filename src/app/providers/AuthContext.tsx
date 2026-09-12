"use client";
import { createContext, useContext } from "react";
import { useSession, type SessionUser } from "@/lib/auth-client";

type AuthContextType = {
  user: SessionUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useSession();
  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, loading: isPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
