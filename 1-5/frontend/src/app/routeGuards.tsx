import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMe, type Role } from '../services/auth';
import { ForbiddenState, LoadingState } from '../ui/states';

export function RequireGuest(props: { children: ReactNode }) {
  const me = useMe();

  if (me.isLoading) return <LoadingState />;
  if (me.data) {
    if (me.data.role === 'Reviewer') return <Navigate to="/reviews" replace />;
    return <Navigate to="/documents" replace />;
  }

  return <>{props.children}</>;
}

export function RequireRole(props: { roles: Role[]; children: ReactNode }) {
  const me = useMe();
  const loc = useLocation();

  if (me.isLoading) return <LoadingState />;

  if (me.isError) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (!me.data) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  if (!props.roles.includes(me.data.role)) return <ForbiddenState />;

  return <>{props.children}</>;
}
