'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/ui/Button';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';

type Dispute = {
  id: string;
  orderId: string;
  subOrderId: string | null;
  status: string;
  openedBy?: string;
  resolutionNote?: string | null;
  createdAt: string;
};

export default function AdminDisputesPage() {
  const disputes = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => apiFetch<{ items: Dispute[] }>('/api/admin/disputes'),
  });

  async function resolve(disputeId: string) {
    const note = prompt('請輸入解決備註（必填）');
    if (!note) return;
    await apiFetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNote: note }),
    });
    await disputes.refetch();
  }

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">糾紛介入</h1>
        <AdminNav />

        {disputes.isLoading ? <LoadingState /> : null}
        {disputes.isError ? (
          <ErrorState message={(disputes.error as unknown as ApiError).message} onRetry={() => disputes.refetch()} />
        ) : null}
        {disputes.data && disputes.data.items.length === 0 ? <EmptyState title="目前沒有糾紛" /> : null}

        <div className="space-y-3">
          {disputes.data?.items.map((d) => (
            <div key={d.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.subOrderId ?? d.orderId}</div>
                <div className="text-sm text-neutral-700">{d.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">orderId: {d.orderId}</div>
              {d.subOrderId ? <div className="mt-1 text-sm text-neutral-700">subOrderId: {d.subOrderId}</div> : null}
              <div className="mt-3">
                <Button onClick={() => resolve(d.id)} disabled={d.status === 'resolved'}>
                  {d.status === 'resolved' ? '已解決' : '標記解決'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
