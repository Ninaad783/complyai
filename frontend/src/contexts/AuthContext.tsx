"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; full_name: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      const storedToken = localStorage.getItem("complyai_token");
      
      // If no token or legacy demo token, clear storage immediately so login page is shown
      if (!storedToken || storedToken.startsWith("demo_")) {
        localStorage.removeItem("complyai_token");
        localStorage.removeItem("complyai_user");
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Validate token against backend /api/v1/auth/me
        const currentUser = await api.auth.me();
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          setToken(storedToken);
          localStorage.setItem("complyai_user", JSON.stringify(currentUser));
        } else {
          throw new Error("Invalid user profile");
        }
      } catch (err) {
        // Stale, invalid, or expired session -> clear storage so user is directed to login
        localStorage.removeItem("complyai_token");
        localStorage.removeItem("complyai_user");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem("complyai_token", data.access_token);
    localStorage.setItem("complyai_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (formData: { email: string; full_name: string; password: string }) => {
    const data = await api.auth.register(formData);
    localStorage.setItem("complyai_token", data.access_token);
    localStorage.setItem("complyai_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("complyai_token");
    localStorage.removeItem("complyai_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
