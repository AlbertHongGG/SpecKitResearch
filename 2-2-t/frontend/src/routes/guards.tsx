import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../state/auth.store';

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const auth = useAuth();

  if (!auth.token) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}

export function RequireRole({
  children,
  roles,
}: {
  children: ReactNode;
  roles: Array<'USER' | 'PROVIDER' | 'ADMIN'>;
}) {
  const auth = useAuth();

  if (auth.token && !auth.user) return <div>Loading...</div>;
  if (!auth.user) return <Navigate to="/401" replace />;
  if (!roles.includes(auth.user.role)) return <Navigate to="/403" replace />;

  return <>{children}</>;
}
