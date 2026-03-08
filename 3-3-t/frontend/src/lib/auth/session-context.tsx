"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type SessionContextState = {
  userId?: string;
  isPlatformAdmin: boolean;
  organizationId?: string;
  setSession: (next: Partial<SessionContextState>) => void;
};

const SessionContext = createContext<SessionContextState>({
  isPlatformAdmin: false,
  setSession: () => undefined,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionContextState>({
    isPlatformAdmin: false,
    setSession: () => undefined,
  });

  const value = useMemo(
    () => ({
      ...state,
      setSession: (next: Partial<SessionContextState>) => {
        setState((prev) => ({ ...prev, ...next, setSession: prev.setSession }));
      },
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
