'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { Loading } from '../../../components/states/Loading';
import { Alert } from '../../../components/ui/Alert';

export default function AdminAuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => apiFetch<any>('/admin/audit?limit=50'),
  });
  if (isLoading) return <Loading />;
  if (error) return <Alert title="載入失敗">{(error as any)?.message}</Alert>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit</h1>
      <div className="rounded border">
        {data?.items?.map((r: any) => (
          <div key={r.id} className="border-b p-3 text-sm">
            <div className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</div>
            <div>{r.action} target={r.targetType}:{r.targetId}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
