'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export type User = {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
};

type AuthContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('session_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem('session_user');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('session_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('session_user');
    }
  }, [user]);

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthContext missing');
  }
  return ctx;
}
