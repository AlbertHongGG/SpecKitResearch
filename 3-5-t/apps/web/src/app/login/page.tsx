'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api-client';
import { getUserFacingErrorMessage } from '../../lib/errors/user-facing-error';

const zLogin = z.object({
  email: z.string().email(),
  password: z.string().min(1, '請輸入密碼'),
});

type LoginInput = z.infer<typeof zLogin>;

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next');
  const queryClient = useQueryClient();

  const form = useForm<LoginInput>({
    resolver: zodResolver(zLogin),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: async (input: LoginInput) => {
      await apiFetch('/auth/login', { method: 'POST', json: input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace(next && next.startsWith('/') ? next : '/projects');
    },
  });

  const err = login.error instanceof ApiError ? login.error : null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">登入</h1>

      <form
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
      >
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="email"
            autoComplete="email"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
            密碼
          </label>
          <input
            id="login-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        {err ? <p className="text-sm text-red-600">{getUserFacingErrorMessage(err, '登入失敗')}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={login.isPending}
        >
          {login.isPending ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  );
}
