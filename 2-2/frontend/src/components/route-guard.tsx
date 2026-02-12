'use client';

import { ReactNode, useEffect } from 'react';
import { useSession } from '../features/auth/use-session';

export function RouteGuard({ children }: { children: ReactNode }) {
  const { user } = useSession();

  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }
  }, [user]);

  if (!user) {
    return null;
  }
  return <>{children}</>;
}
