'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiFetch } from '../../lib/api-client';
import { getUserFacingErrorMessage } from '../../lib/errors/user-facing-error';

const zRegister = z.object({
  email: z.string().email(),
  password: z.string().min(8, '密碼至少 8 碼'),
  displayName: z.string().min(1, '請輸入顯示名稱').max(100),
});

type RegisterInput = z.infer<typeof zRegister>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(zRegister),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const register = useMutation({
    mutationFn: async (input: RegisterInput) => {
      await apiFetch('/auth/register', { method: 'POST', json: input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/projects');
    },
  });

  const err = register.error instanceof ApiError ? register.error : null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">註冊</h1>

      <form
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={form.handleSubmit((v) => register.mutate(v))}
      >
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-displayName" className="block text-sm font-medium text-slate-700">
            顯示名稱
          </label>
          <input
            id="register-displayName"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="text"
            autoComplete="nickname"
            {...form.register('displayName')}
          />
          {form.formState.errors.displayName ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.displayName.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-slate-700">
            密碼
          </label>
          <input
            id="register-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        {err ? <p className="text-sm text-red-600">{getUserFacingErrorMessage(err, '註冊失敗')}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={register.isPending}
        >
          {register.isPending ? '註冊中…' : '註冊'}
        </button>
      </form>
    </div>
  );
}
