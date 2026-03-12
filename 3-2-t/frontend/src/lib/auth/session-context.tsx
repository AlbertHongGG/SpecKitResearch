'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  platformRoles: string[];
}

export interface SessionState {
  authenticated: boolean;
  csrfToken: string | null;
  user: SessionUser | null;
  activeOrganizationId: string | null;
  organizationMemberships: Array<{ organizationId: string; role: string; status: string }>;
  projectMemberships: Array<{ projectId: string; role: string }>;
}

interface SessionContextValue extends SessionState {
  loading: boolean;
  refresh: () => Promise<void>;
}

const defaultSessionState: SessionState = {
  authenticated: false,
  csrfToken: null,
  user: null,
  activeOrganizationId: null,
  organizationMemberships: [],
  projectMemberships: [],
};

const SessionContext = createContext<SessionContextValue>({
  ...defaultSessionState,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(defaultSessionState);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
      const response = await fetch(`${baseUrl}/session`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        setState(defaultSessionState);
        return;
      }

      const payload = (await response.json()) as SessionState;
      setState(payload);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      loading,
      refresh,
    }),
    [loading, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
