import React, { createContext, useContext, useMemo, useState } from 'react';

export type Role = 'employee' | 'manager' | 'hr';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department_id: string;
  manager_id: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  clear: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setUser,
      clear: () => setUser(null),
    }),
    [user],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
