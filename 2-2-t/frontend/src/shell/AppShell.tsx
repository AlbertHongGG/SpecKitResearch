import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Header } from '../components/Header';
import { ApiError, apiGetJson } from '../api/http';
import { MeResponseSchema } from '../api/schemas';
import { clearAuth, setAuthUser, useAuth } from '../state/auth.store';

export default function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.token) return;
    if (auth.user) return;

    let cancelled = false;
    void (async () => {
      try {
        const me = await apiGetJson('/auth/me', MeResponseSchema);
        if (cancelled) return;
        setAuthUser(me);
      } catch (e: unknown) {
        if (cancelled) return;

        clearAuth();
        if (e instanceof ApiError && e.status === 403) {
          navigate('/403', { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.token, auth.user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
