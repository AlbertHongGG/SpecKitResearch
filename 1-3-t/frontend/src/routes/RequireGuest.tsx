import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useSession } from '../auth/useSession';

export function RequireGuest(props: { children: ReactNode }) {
  const session = useSession();

  if (session.isLoading) {
    return <div className="text-sm text-slate-600">載入中…</div>;
  }

  if (session.data?.authenticated) {
    return <Navigate to="/transactions" replace />;
  }

  return <>{props.children}</>;
}
