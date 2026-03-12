'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { apiFetch } from '@/services/http';

type CatalogEndpoint = {
  endpoint_id: string;
  method: string;
  path: string;
  description: string | null;
  required_scopes: string[];
};

type CatalogService = {
  service_id: string;
  name: string;
  description: string;
  endpoints: CatalogEndpoint[];
};

export default function DocsPage() {
  const query = useQuery({
    queryKey: ['catalog'],
    queryFn: () => apiFetch<CatalogService[]>('/catalog'),
  });

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">只顯示啟用中的 services / endpoints 與所需 scopes。</p>
      </header>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState label="載入失敗" /> : null}
      {query.isSuccess && query.data.length === 0 ? <EmptyState label="目前沒有任何啟用中的 endpoints。" /> : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="grid gap-4">
          {query.data.map((svc) => (
            <section
              key={svc.service_id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{svc.name}</h2>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{svc.description}</span>
              </div>

              {svc.endpoints.length === 0 ? (
                <div className="mt-3">
                  <EmptyState label="此 service 目前沒有啟用中的 endpoints。" />
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {svc.endpoints.map((ep) => {
                    const gatewayPath = `/gateway/${svc.name}${ep.path}`;
                    return (
                      <div key={ep.endpoint_id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            {ep.method}
                          </span>
                          <code className="font-mono text-xs">{gatewayPath}</code>
                        </div>

                        {ep.description ? (
                          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{ep.description}</div>
                        ) : null}

                        <div className="mt-2 text-sm">
                          <span className="font-medium">Required scopes:</span>{' '}
                          {ep.required_scopes.length ? (
                            <span className="font-mono text-xs">{ep.required_scopes.join(', ')}</span>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-400">（尚未設定）</span>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-sm font-medium">cURL</div>
                          <pre className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
{`curl -i \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  http://localhost:3000${gatewayPath}`}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
