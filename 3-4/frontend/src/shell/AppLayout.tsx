import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../api/session';
import { logout } from '../api/auth';
import { Button } from '../components/ui/Button';

export function AppLayout() {
  const navigate = useNavigate();
  const session = useSession();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link className="font-semibold" to="/orders">
              PaySim
            </Link>
            <Link className="text-sm text-slate-700 hover:underline" to="/orders">
              Orders
            </Link>
            <Link className="text-sm text-slate-700 hover:underline" to="/webhook-endpoints">
              Webhooks
            </Link>
            {session.data?.user.role === 'ADMIN' ? (
              <Link className="text-sm text-slate-700 hover:underline" to="/admin">
                Admin
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">{session.data?.user.email}</div>
            <Button variant="secondary" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
