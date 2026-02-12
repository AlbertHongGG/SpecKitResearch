import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useSession } from '../auth/useSession';

export function RequireAuth(props: { children: ReactNode }) {
  const location = useLocation();
  const session = useSession();

  if (session.isLoading) {
    return <div className="text-sm text-slate-600">載入中…</div>;
  }

  if (!session.data?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{props.children}</>;
}
