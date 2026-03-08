'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `更新失敗（HTTP ${err.status}）`;
  }
  return '更新失敗';
}

function isoToLocalInput(iso: string): string {
  // datetime-local expects yyyy-MM-ddTHH:mm
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ApiKeySettingsForm({ apiKey }: { apiKey: ApiKey }) {
  const queryClient = useQueryClient();
  const isActive = apiKey.status === 'active' && !apiKey.revoked_at;

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: apiKey.name,
      scopes: apiKey.scopes.join(', '),
      expires_at: apiKey.expires_at ? isoToLocalInput(apiKey.expires_at) : '',
      rate_limit_per_minute: apiKey.rate_limit_per_minute == null ? '' : String(apiKey.rate_limit_per_minute),
      rate_limit_per_hour: apiKey.rate_limit_per_hour == null ? '' : String(apiKey.rate_limit_per_hour)
    }),
    [apiKey]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
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

      return apiFetch<ApiKey>(`/api-keys/${apiKey.api_key_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name.trim(),
          scopes,
          expires_at: expiresAt,
          rate_limit_per_minute: rateLimitPerMinute,
          rate_limit_per_hour: rateLimitPerHour
        })
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">設定</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            只有狀態為 active 的 key 可以更新。
          </div>
        </div>
        {!isActive ? (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            此 key 目前不可更新
          </span>
        ) : null}
      </div>

      <form
        className="mt-4 grid gap-3"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">名稱</span>
          <input
            disabled={!isActive || mutation.isPending}
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
            disabled={!isActive || mutation.isPending}
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
              disabled={!isActive || mutation.isPending}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
              {...form.register('expires_at')}
            />
          </label>

          <div className="grid grid-cols-1 gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">每分鐘上限（可選）</span>
              <input
                inputMode="numeric"
                disabled={!isActive || mutation.isPending}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                {...form.register('rate_limit_per_minute')}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">每小時上限（可選）</span>
              <input
                inputMode="numeric"
                disabled={!isActive || mutation.isPending}
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

        {mutation.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            已更新
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => form.reset(defaultValues)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            重設
          </button>
          <button
            type="submit"
            disabled={!isActive || mutation.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {mutation.isPending ? '更新中…' : '更新'}
          </button>
        </div>
      </form>
    </section>
  );
}
