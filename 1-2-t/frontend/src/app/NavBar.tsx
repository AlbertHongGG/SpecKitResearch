import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/authStore';
import { LogoutButton } from '../features/auth/components/LogoutButton';

export function NavBar() {
  const { user } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-semibold text-slate-900">
            Leave Management
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" to="/my-leave-requests">
              我的請假
            </Link>
            <Link className="text-slate-600 hover:text-slate-900" to="/leave-balance">
              剩餘額度
            </Link>
            {user?.role === 'manager' ? (
              <>
                <Link className="text-slate-600 hover:text-slate-900" to="/approvals">
                  待審
                </Link>
                <Link className="text-slate-600 hover:text-slate-900" to="/calendar">
                  日曆
                </Link>
              </>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            {user?.name} ({user?.role})
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
