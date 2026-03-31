import { useMemo, useState } from 'react';

import { AdminReportsPanel } from '../features/admin-reports/AdminReportsPanel';
import { AdminServiceStatusManagePanel } from '../features/admin-service-status-manage/AdminServiceStatusManagePanel';
import { AdminUserStatusManagePanel } from '../features/admin-user-status-manage/AdminUserStatusManagePanel';

type TabKey = 'accounts' | 'services' | 'reports';

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>('accounts');

  const title = useMemo(() => {
    if (tab === 'accounts') return 'Accounts';
    if (tab === 'services') return 'Services';
    return 'Reports';
  }, [tab]);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Admin</h1>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={
            tab === 'accounts'
              ? 'rounded border bg-black px-3 py-2 text-sm text-white'
              : 'rounded border px-3 py-2 text-sm'
          }
          onClick={() => setTab('accounts')}
        >
          Accounts
        </button>
        <button
          type="button"
          className={
            tab === 'services'
              ? 'rounded border bg-black px-3 py-2 text-sm text-white'
              : 'rounded border px-3 py-2 text-sm'
          }
          onClick={() => setTab('services')}
        >
          Services
        </button>
        <button
          type="button"
          className={
            tab === 'reports'
              ? 'rounded border bg-black px-3 py-2 text-sm text-white'
              : 'rounded border px-3 py-2 text-sm'
          }
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
      </div>

      <div className="mt-6 rounded border bg-white p-4">
        <h2 className="text-sm font-semibold">{title}</h2>

        <div className="mt-3">
          {tab === 'accounts' ? (
            <AdminUserStatusManagePanel />
          ) : tab === 'services' ? (
            <AdminServiceStatusManagePanel />
          ) : (
            <AdminReportsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
