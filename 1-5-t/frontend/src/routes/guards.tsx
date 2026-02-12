import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../auth/useSession';
import { Spinner } from '../components/ui/Spinner';

export function ProtectedRoute() {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RoleRoute(props: { roles: Array<'User' | 'Reviewer' | 'Admin'> }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!props.roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}
