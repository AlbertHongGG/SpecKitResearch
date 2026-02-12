import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { useMe } from '../api/hooks/useMe';
import { ErrorState } from '../components/feedback/ErrorState';
import { Loading } from '../components/feedback/Loading';
import { Error403Page } from '../pages/Error403Page';
import { useAuth } from './authStore';

export function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { token } = useAuth();
  const location = useLocation();

  const me = useMe({ enabled: Boolean(token) });

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (me.isLoading) return <Loading label="驗證管理員身分中…" />;

  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <ErrorState error={me.error} title="無法驗證身分" />;
  }

  if (!me.data || me.data.role !== 'admin') {
    return <Error403Page />;
  }

  return <Outlet />;
}
