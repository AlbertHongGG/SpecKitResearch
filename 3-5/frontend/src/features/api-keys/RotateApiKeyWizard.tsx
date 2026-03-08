'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { ApiKeyPlaintextCard } from '@/features/api-keys/ApiKeyPlaintextCard';
import type { ApiKey } from '@/features/api-keys/api-keys.types';
import { apiFetch, type ApiError, HttpError } from '@/services/http';

const schema = z.object({
  name: z.string().trim().min(1, '請輸入名稱'),
  scopes: z.string().trim().min(1, '請輸入至少一個 scope（以逗號分隔）'),
  expires_at: z.string().optional(),
  rate_limit_per_minute: z.string().optional(),
  rate_limit_per_hour: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

type CreateResponse = {
  api_key_id: string;
  api_key_plaintext: string;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `輪替失敗（HTTP ${err.status}）`;
  }
  return '輪替失敗';
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RotateApiKeyWizard({ apiKey }: { apiKey: ApiKey }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ apiKeyId: string; plaintext: string } | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const isActive = apiKey.status === 'active' && !apiKey.revoked_at;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: `${apiKey.name} (rotated)`,
      scopes: apiKey.scopes.join(', '),
      expires_at: apiKey.expires_at ? isoToLocalInput(apiKey.expires_at) : '',
      rate_limit_per_minute: apiKey.rate_limit_per_minute == null ? '' : String(apiKey.rate_limit_per_minute),
      rate_limit_per_hour: apiKey.rate_limit_per_hour == null ? '' : String(apiKey.rate_limit_per_hour)
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const scopes = values.scopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const expiresAt = values.expires_at?.trim() ? new Date(values.expires_at).toISOString() : null;
      const rateLimitPerMinute = values.rate_limit_per_minute?.trim()
        ? Number(values.rate_limit_per_minute)
        : null;
      const rateLimitPerHour = values.rate_limit_per_hour?.trim() ? Number(values.rate_limit_per_hour) : null;

      return apiFetch<CreateResponse>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name.trim(),
          scopes,
          expires_at: expiresAt,
          rate_limit_per_minute: rateLimitPerMinute,
          rate_limit_per_hour: rateLimitPerHour,
          replaces_api_key_id: apiKey.api_key_id
        })
      });
    },
    onSuccess: async (res) => {
      setResult({ apiKeyId: res.api_key_id, plaintext: res.api_key_plaintext });
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });

  return (
    <>
      <button
        type="button"
        disabled={!isActive}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
      >
        輪替（Rotate）
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">輪替 API Key</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  系統會建立一把新 key，並立即撤銷舊 key。新 key 的原文只會顯示一次。
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

            {result ? (
              <div className="mt-4 grid gap-3">
                <ApiKeyPlaintextCard plaintext={result.plaintext} onDismiss={() => setResult(null)} />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    完成
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/keys/${result.apiKeyId}`);
                      setOpen(false);
                    }}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    前往新 Key
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-4 grid gap-3"
                onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              >
                <label className="grid gap-1">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">新 Key 名稱</span>
                  <input
                    disabled={mutation.isPending}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name ? (
                    <span className="text-sm text-red-600">{form.formState.errors.name.message}</span>
                  ) : null}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Scopes（逗號分隔）</span>
                  <input
                    disabled={mutation.isPending}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                    {...form.register('scopes')}
                  />
                  {form.formState.errors.scopes ? (
                    <span className="text-sm text-red-600">{form.formState.errors.scopes.message}</span>
                  ) : null}
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">到期時間（可選）</span>
                    <input
                      type="datetime-local"
                      disabled={mutation.isPending}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                      {...form.register('expires_at')}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3">
                    <label className="grid gap-1">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">每分鐘上限（可選）</span>
                      <input
                        inputMode="numeric"
                        disabled={mutation.isPending}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                        {...form.register('rate_limit_per_minute')}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">每小時上限（可選）</span>
                      <input
                        inputMode="numeric"
                        disabled={mutation.isPending}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                        {...form.register('rate_limit_per_hour')}
                      />
                    </label>
                  </div>
                </div>

                {mutation.isError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    {getErrorMessage(mutation.error)}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {mutation.isPending ? '輪替中…' : '建立新 Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
