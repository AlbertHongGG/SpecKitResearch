import { useMutation } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { queryClient } from './queryClient';
import { useSession } from '../auth/useSession';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/toast/ToastContext';

function TopNavLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `rounded-md px-2 py-1 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`
      }
    >
      {props.label}
    </NavLink>
  );
}

export function AppShell() {
  const { user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.info('已登出');
      navigate('/login', { replace: true });
    },
    onError: (e) => {
      toast.error('登出失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold text-slate-900">
              Doc Review
            </Link>
            <nav className="flex items-center gap-2">
              <TopNavLink to="/documents" label="文件" />
              {user?.role === 'Reviewer' ? <TopNavLink to="/reviews" label="我的待辦" /> : null}
              {user?.role === 'Admin' ? <TopNavLink to="/admin/flows" label="流程模板" /> : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="text-xs text-slate-600">
                {user.email} · {user.role}
              </div>
            ) : null}
            <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
