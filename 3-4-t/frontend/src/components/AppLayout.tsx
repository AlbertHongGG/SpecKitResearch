import { Link, Outlet } from 'react-router-dom';
import { useLogoutMutation, useMeQuery } from '../services/auth';

export function AppLayout() {
  const me = useMeQuery();
  const logout = useLogoutMutation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link className="font-semibold" to="/orders">
              Payment Flow Sim
            </Link>
            <Link className="text-sm text-white/80 hover:text-white" to="/orders">
              Orders
            </Link>
            {me.data && me.data.authenticated && me.data.role === 'ADMIN' ? (
              <Link className="text-sm text-white/80 hover:text-white" to="/admin">
                Admin
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {me.data && me.data.authenticated ? (
              <>
                <span className="text-sm text-white/70">{me.data.email}</span>
                <button
                  className="rounded bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm"
                  onClick={() => logout.mutate()}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link className="text-sm text-white/80 hover:text-white" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
