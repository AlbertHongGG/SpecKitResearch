import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../services/auth';

export function RequireGuest(props: { children: ReactNode }) {
  const me = useMeQuery();
  if (me.isLoading) return <div className="p-6">Loading…</div>;
  if (me.data && me.data.authenticated) return <Navigate to="/orders" replace />;
  return <>{props.children}</>;
}

export function RequireUser(props: { children: ReactNode }) {
  const me = useMeQuery();
  if (me.isLoading) return <div className="p-6">Loading…</div>;
  if (!me.data || !me.data.authenticated) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}

export function RequireAdmin(props: { children: ReactNode }) {
  const me = useMeQuery();
  if (me.isLoading) return <div className="p-6">Loading…</div>;
  if (!me.data || !me.data.authenticated) return <Navigate to="/login" replace />;
  if (me.data.role !== 'ADMIN') return <Navigate to="/orders" replace />;
  return <>{props.children}</>;
}
