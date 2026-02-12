import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/authStore';

export function RequireAuth() {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}

export function RequireRole({ role }: { role: 'manager' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
