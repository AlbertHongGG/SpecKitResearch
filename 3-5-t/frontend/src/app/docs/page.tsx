'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Loading } from '../../components/states/Loading';
import { Alert } from '../../components/ui/Alert';

export default function DocsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['docs'],
    queryFn: async () => apiFetch<{ services: any[] }>('/docs'),
  });

  if (isLoading) return <Loading />;
  if (error) return <Alert title="載入失敗">{(error as any)?.message}</Alert>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Docs</h1>
      {data?.services.map((s) => (
        <div key={s.id} className="rounded border p-4">
          <div className="font-semibold">{s.slug} — {s.name}</div>
          <div className="mt-2 space-y-2">
            {s.endpoints.map((e: any) => (
              <div key={e.id} className="rounded bg-gray-50 p-2 text-sm">
                <span className="font-mono">
                  {String(e.http_method ?? e.httpMethod ?? e.method ?? '')
                    .trim()
                    .toUpperCase()}
                </span>{' '}
                <span className="font-mono">{String(e.path_pattern ?? e.pathPattern ?? e.path ?? '')}</span>
                {Array.isArray(e.required_scopes ?? e.requiredScopes) && (e.required_scopes ?? e.requiredScopes).length ? (
                  <span className="ml-2 text-xs text-gray-600">
                    scopes: {(e.required_scopes ?? e.requiredScopes).join(', ')}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-gray-600">public</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
