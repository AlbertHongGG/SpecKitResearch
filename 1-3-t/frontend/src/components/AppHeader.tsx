import { Link, useLocation } from 'react-router-dom';

import { useSession } from '../auth/useSession';
import { MobileNav } from './MobileNav';
import { LogoutButton } from './LogoutButton';

export function AppHeader() {
  const location = useLocation();
  const sessionQuery = useSession();
  const authenticated = sessionQuery.data?.authenticated === true;

  const isOnLogin = location.pathname === '/login';
  const isOnRegister = location.pathname === '/register';

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="font-semibold">
          記帳
        </Link>

        {authenticated ? (
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link to="/transactions" className="text-slate-700 hover:text-slate-900">
              帳務
            </Link>
            <Link to="/categories" className="text-slate-700 hover:text-slate-900">
              類別
            </Link>
            <Link to="/reports" className="text-slate-700 hover:text-slate-900">
              月報表
            </Link>
            <LogoutButton />
          </nav>
        ) : (
          <nav className="hidden items-center gap-3 text-sm md:flex">
            {!isOnLogin && (
              <Link
                to="/login"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                登入
              </Link>
            )}
            {!isOnRegister && (
              <Link
                to="/register"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
              >
                註冊
              </Link>
            )}
          </nav>
        )}

        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
