import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../api/session';
import { Spinner } from '../components/ui/Spinner';

export function ProtectedRoute() {
  const location = useLocation();
  const session = useSession();

  if (session.isLoading) return <Spinner label="Checking session..." />;

  if (session.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const location = useLocation();
  const session = useSession();

  if (session.isLoading) return <Spinner label="Checking session..." />;
  if (session.isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!session.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (session.data.user.role !== 'ADMIN') return <Navigate to="/orders" replace />;

  return <Outlet />;
}
