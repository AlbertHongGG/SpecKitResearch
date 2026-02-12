import { Link, Outlet } from 'react-router-dom';
import { useMe } from '../services/auth';
import { LogoutButton } from '../components/LogoutButton';

export function Layout() {
  const me = useMe();

  const role = me.data?.role;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link className="text-sm font-semibold" to="/">
              Doc Review
            </Link>

            {role && role !== 'Reviewer' ? (
              <Link className="text-sm text-slate-700 hover:text-slate-900" to="/documents">
                文件
              </Link>
            ) : null}

            {role === 'Reviewer' ? (
              <Link className="text-sm text-slate-700 hover:text-slate-900" to="/reviews">
                待辦
              </Link>
            ) : null}

            {role === 'Admin' ? (
              <Link className="text-sm text-slate-700 hover:text-slate-900" to="/admin/flows">
                流程模板
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {me.data ? <div className="text-xs text-slate-600">{me.data.email}</div> : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
