'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { ApiKey } from '@/features/api-keys/api-keys.types';
import { apiFetch, type ApiError, HttpError } from '@/services/http';

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `撤銷失敗（HTTP ${err.status}）`;
  }
  return '撤銷失敗';
}

export function RevokeApiKeyButton({ apiKey }: { apiKey: ApiKey }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isRevoked = apiKey.status !== 'active' || Boolean(apiKey.revoked_at);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiFetch<void>(`/api-keys/${apiKey.api_key_id}/revoke`, { method: 'POST' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setOpen(false);
    }
  });

  return (
    <>
      <button
        type="button"
        disabled={isRevoked}
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/30"
      >
        撤銷此 Key
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">確認撤銷</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  撤銷後將立即失效，無法復原。
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                關閉
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-medium">{apiKey.name}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{apiKey.api_key_id}</div>
            </div>

            {mutation.isError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {getErrorMessage(mutation.error)}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                取消
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                {mutation.isPending ? '撤銷中…' : '確認撤銷'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
