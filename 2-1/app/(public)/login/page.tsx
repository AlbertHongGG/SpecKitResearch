'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineError } from '@/components/ui/InlineError';
import { queryKeys } from '@/lib/queryKeys';
import { authClient } from '@/services/authClient';

const schema = z.object({
  email: z.string().email('請輸入正確 email'),
  password: z.string().min(1, '請輸入密碼'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authClient.login(values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.me() });
      router.push('/my-courses');
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">登入</h1>

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await mutation.mutateAsync(values);
        })}
      >
        <div>
          <label className="text-sm text-slate-700" htmlFor="login-email">Email</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="email"
            id="login-email"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          {form.formState.errors.email?.message ? (
            <InlineError message={form.formState.errors.email.message} />
          ) : null}
        </div>

        <div>
          <label className="text-sm text-slate-700" htmlFor="login-password">密碼</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            id="login-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          {form.formState.errors.password?.message ? (
            <InlineError message={form.formState.errors.password.message} />
          ) : null}
        </div>

        {mutation.isError ? <InlineError message={(mutation.error as any).message ?? '登入失敗'} /> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? '登入中…' : '登入'}
        </button>

        <p className="text-sm text-slate-600">
          還沒有帳號？
          <Link className="ml-1 text-blue-700 underline" href="/register">
            註冊
          </Link>
        </p>
      </form>
    </div>
  );
}
