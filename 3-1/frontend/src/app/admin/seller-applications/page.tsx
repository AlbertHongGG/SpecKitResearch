'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/ui/Button';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';

type App = {
  id: string;
  userId: string;
  shopName: string;
  status: 'submitted' | 'approved' | 'rejected';
  createdAt: string;
};

export default function AdminSellerApplicationsPage() {
  const apps = useQuery({
    queryKey: ['admin-seller-apps'],
    queryFn: () => apiFetch<{ items: App[] }>('/api/admin/seller-applications?status=submitted'),
  });

  async function decide(applicationId: string, decision: 'approved' | 'rejected') {
    await apiFetch(`/api/admin/seller-applications/${applicationId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    await apps.refetch();
  }

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">賣家申請審核</h1>
        <AdminNav />

        {apps.isLoading ? <LoadingState /> : null}
        {apps.isError ? (
          <ErrorState message={(apps.error as unknown as ApiError).message} onRetry={() => apps.refetch()} />
        ) : null}
        {apps.data && apps.data.items.length === 0 ? <EmptyState title="目前沒有待審核申請" /> : null}

        <div className="space-y-3">
          {apps.data?.items.map((a) => (
            <div key={a.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.shopName}</div>
                <div className="text-sm text-neutral-700">{a.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">userId: {a.userId}</div>

              <div className="mt-3 flex gap-2">
                <Button variant="primary" onClick={() => decide(a.id, 'approved')}>
                  核准
                </Button>
                <Button variant="danger" onClick={() => decide(a.id, 'rejected')}>
                  拒絕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
