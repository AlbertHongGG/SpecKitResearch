import { Link, Outlet } from 'react-router-dom';
import { clearToken, useAuth } from '../../auth/authStore';

export function AppShell() {
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="font-semibold">
              活動平台
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Link to="/" className="hover:text-slate-900">
                活動
              </Link>
              <Link to="/me/activities" className="hover:text-slate-900">
                我的活動
              </Link>
              <Link to="/admin" className="hover:text-slate-900">
                後台
              </Link>
            </nav>
          </div>

          <div className="text-sm">
            {token ? (
              <button
                type="button"
                className="rounded-md border px-2 py-1 hover:bg-slate-50"
                onClick={() => clearToken()}
              >
                登出
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-md border px-2 py-1 hover:bg-slate-50"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
