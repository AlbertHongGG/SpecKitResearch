import { Navigate, useLocation } from 'react-router-dom';

import { useSession } from '../hooks/useSession';

export function RequireMemberOrAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/activities" replace />;
  }

  return <>{children}</>;
}
