'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../../lib/api';
import { Loading } from '../../../../components/states/Loading';
import { Alert } from '../../../../components/ui/Alert';

export default function KeyUsagePage() {
  const params = useParams<{ keyId: string }>();
  const keyId = params.keyId;
  const { data, isLoading, error } = useQuery({
    queryKey: ['usage', keyId],
    queryFn: async () => apiFetch<{ items: any[] }>(`/keys/${keyId}/usage?limit=50`),
  });

  if (isLoading) return <Loading />;
  if (error) return <Alert title="載入失敗">{(error as any)?.message}</Alert>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Usage: {keyId}</h1>
      <div className="rounded border">
        <div className="grid grid-cols-5 gap-2 border-b p-3 text-xs font-semibold text-gray-600">
          <div>Time</div>
          <div>Service</div>
          <div>Method</div>
          <div>Status</div>
          <div>Path</div>
        </div>
        {data?.items.map((r) => (
          <div key={r.id} className="grid grid-cols-5 gap-2 p-3 text-sm">
            <div className="text-xs">{new Date(r.createdAt).toLocaleString()}</div>
            <div>{r.serviceSlug ?? '-'}</div>
            <div>{r.method}</div>
            <div>{r.statusCode}</div>
            <div className="truncate" title={r.path}>{r.path}</div>
          </div>
        ))}
        {data?.items.length === 0 ? <div className="p-3 text-sm text-gray-600">No logs</div> : null}
      </div>
    </div>
  );
}
