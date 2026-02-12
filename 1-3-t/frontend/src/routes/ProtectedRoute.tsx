import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute(props: {
  allow: boolean;
  redirectTo: string;
  children: ReactNode;
}) {
  if (!props.allow) return <Navigate to={props.redirectTo} replace />;
  return <>{props.children}</>;
}
