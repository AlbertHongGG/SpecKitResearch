'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';

type AuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

export default function AdminAuditLogsPage() {
  const logs = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => apiFetch<{ items: AuditLog[] }>('/api/admin/audit-logs'),
  });

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">稽核查詢</h1>
        <AdminNav />

        {logs.isLoading ? <LoadingState /> : null}
        {logs.isError ? (
          <ErrorState message={(logs.error as unknown as ApiError).message} onRetry={() => logs.refetch()} />
        ) : null}
        {logs.data && logs.data.items.length === 0 ? <EmptyState title="沒有稽核紀錄" /> : null}

        <div className="space-y-2">
          {logs.data?.items.map((l) => (
            <div key={l.id} className="rounded border border-neutral-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{l.action}</div>
                <div className="text-neutral-600">{new Date(l.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-neutral-700">
                actor: {l.actorUserId} · target: {l.targetType}:{l.targetId}
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
