'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiFetch, type ApiError, HttpError } from '@/services/http';

const schema = z.object({
  email: z.string().trim().email('請輸入有效 Email'),
  password: z.string().min(8, '密碼至少 8 碼')
});

type FormValues = z.infer<typeof schema>;

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `註冊失敗（HTTP ${err.status}）`;
  }
  return '註冊失敗';
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = useMemo(() => searchParams.get('next') ?? '/keys', [searchParams]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(values)
      });
    },
    onSuccess: () => {
      router.push(`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(form.getValues('email'))}`);
    }
  });

  return (
    <form
      className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div>
        <h1 className="text-xl font-semibold">註冊</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">建立 Developer 帳號以管理 API Keys。</p>
      </div>

      <label className="grid gap-1">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          type="email"
          autoComplete="email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <span className="text-sm text-red-600">{form.formState.errors.email.message}</span>
        ) : null}
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">Password</span>
        <input
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <span className="text-sm text-red-600">{form.formState.errors.password.message}</span>
        ) : null}
      </label>

      {mutation.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {getErrorMessage(mutation.error)}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {mutation.isPending ? '註冊中…' : '建立帳號'}
      </button>
    </form>
  );
}
