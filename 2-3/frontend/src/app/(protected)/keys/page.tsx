'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';

import { ApiKeyPlaintextCard } from '@/features/api-keys/ApiKeyPlaintextCard';
import { CreateApiKeyDialog } from '@/features/api-keys/CreateApiKeyDialog';
import type { ApiKey } from '@/features/api-keys/api-keys.types';
import { apiFetch, type ApiError, HttpError } from '@/services/http';

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `載入失敗（HTTP ${err.status}）`;
  }
  return '載入失敗';
}

export default function KeysPage() {
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<ApiKey[]>('/api-keys')
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            建立與管理你的 API Keys。建立時只會顯示一次原文。
          </p>
        </div>
        <CreateApiKeyDialog onCreatedPlaintext={(p) => setPlaintext(p)} />
      </div>

      {plaintext ? <ApiKeyPlaintextCard plaintext={plaintext} onDismiss={() => setPlaintext(null)} /> : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {query.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}

        {query.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {getErrorMessage(query.error)}
          </div>
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">尚未建立任何 API Key。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">名稱</th>
                  <th className="py-2 pr-3">Scopes</th>
                  <th className="py-2 pr-3">狀態</th>
                  <th className="py-2 pr-3">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((k) => (
                  <tr key={k.api_key_id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">
                      <Link
                        href={`/keys/${k.api_key_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {k.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{k.status}</td>
                    <td className="py-2 pr-3">{new Date(k.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
