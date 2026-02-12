import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '../../../api/errorHandling';
import { useAuth } from '../authStore';
import { useLogin } from '../api/useLogin';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const { user, setUser } = useAuth();
  const login = useLogin();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (user) nav(next, { replace: true });
  }, [user, nav, next]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">登入</h1>
          <p className="mt-1 text-sm text-slate-600">使用公司帳號登入請假系統。</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              const res = await login.mutateAsync(values);
              setUser(res.user);
              nav(next, { replace: true });
            })}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email?.message ? (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password?.message ? (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            {login.isError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {getApiErrorMessage(login.error)}
              </div>
            ) : null}

            <button
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              type="submit"
              disabled={login.isPending}
            >
              {login.isPending ? '登入中…' : '登入'}
            </button>

            <div className="text-xs text-slate-500">
              測試帳號（seed）：employee@example.com / manager@example.com，密碼 password123
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
