import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("point001_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("point001_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.get<{ user: User }>("/auth/me");
        setUser(data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem("point001_token");
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("point001_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string): Promise<void> => {
    const data = await api.post<{ token: string; user: User }>("/auth/register", { email, password, name });
    localStorage.setItem("point001_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("point001_token");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
