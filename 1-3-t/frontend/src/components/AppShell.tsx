import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader';
import { useAuthRequiredRedirect } from '../auth/useAuthRequiredRedirect';

export function AppShell() {
  useAuthRequiredRedirect();

  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
