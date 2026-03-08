'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiFetch, type ApiError, HttpError } from '@/services/http';

const schema = z.object({
  name: z.string().trim().min(1, '請輸入名稱'),
  scopes: z.string().trim().min(1, '請輸入至少一個 scope（以逗號分隔）'),
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
    return body?.error?.message ?? `建立失敗（HTTP ${err.status}）`;
  }
  return '建立失敗';
}

export function CreateApiKeyDialog({
  onCreatedPlaintext
}: {
  onCreatedPlaintext: (plaintext: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      scopes: 'demo:read',
      rate_limit_per_minute: '3',
      rate_limit_per_hour: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const scopes = values.scopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        name: values.name,
        scopes,
        rate_limit_per_minute: values.rate_limit_per_minute ? Number(values.rate_limit_per_minute) : undefined,
        rate_limit_per_hour: values.rate_limit_per_hour ? Number(values.rate_limit_per_hour) : undefined
      };

      return apiFetch<CreateResponse>('/api-keys', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },
    onSuccess: async (res) => {
      onCreatedPlaintext(res.api_key_plaintext);
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        建立 API Key
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">建立 API Key</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  建立後只會回傳一次原文。
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

            <form
              className="mt-4 grid gap-3"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <label className="grid gap-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">名稱</span>
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                  {...form.register('name')}
                />
                {form.formState.errors.name ? (
                  <span className="text-sm text-red-600">{form.formState.errors.name.message}</span>
                ) : null}
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Scopes（逗號分隔）</span>
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                  {...form.register('scopes')}
                />
                {form.formState.errors.scopes ? (
                  <span className="text-sm text-red-600">{form.formState.errors.scopes.message}</span>
                ) : null}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">每分鐘上限（可選）</span>
                  <input
                    inputMode="numeric"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                    {...form.register('rate_limit_per_minute')}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">每小時上限（可選）</span>
                  <input
                    inputMode="numeric"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                    {...form.register('rate_limit_per_hour')}
                  />
                </label>
              </div>

              {mutation.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {getErrorMessage(mutation.error)}
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {mutation.isPending ? '建立中…' : '建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
