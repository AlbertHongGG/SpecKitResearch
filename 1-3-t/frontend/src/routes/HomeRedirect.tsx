import { Navigate } from 'react-router-dom';

import { useSession } from '../auth/useSession';

export function HomeRedirect() {
  const session = useSession();

  if (session.isLoading) {
    return <div className="text-sm text-slate-600">載入中…</div>;
  }

  return session.data?.authenticated ? (
    <Navigate to="/transactions" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}
