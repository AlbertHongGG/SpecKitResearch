import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '../services/apiClient';
import { useAuthActions, useMe } from '../services/auth';
import { AsyncButton } from '../ui/AsyncButton';

const LoginSchema = z.object({
  email: z.string().email('請輸入有效 email'),
  password: z.string().min(1, '請輸入密碼'),
});

type LoginForm = z.infer<typeof LoginSchema>;

export function LoginPage() {
  const me = useMe();
  const { login } = useAuthActions();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await login(values.email, values.password);
      const role = me.data?.role;
      if (role === 'Reviewer') navigate('/reviews', { replace: true });
      else navigate('/documents', { replace: true });
    } catch (e) {
      const err = e as unknown;
      if (err instanceof ApiError) {
        form.setError('root', { message: err.payload?.message ?? '登入失敗' });
      } else {
        form.setError('root', { message: '登入失敗' });
      }
    }
  });

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">登入</h1>
        <p className="mt-1 text-sm text-slate-600">請使用公司帳號登入以存取系統。</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              id="email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <div className="mt-1 text-xs text-rose-700">{form.formState.errors.email.message}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              密碼
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <div className="mt-1 text-xs text-rose-700">{form.formState.errors.password.message}</div>
            ) : null}
          </div>

          {form.formState.errors.root ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {form.formState.errors.root.message}
            </div>
          ) : null}

          <AsyncButton
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            isLoading={form.formState.isSubmitting}
            loadingText="登入中…"
            type="submit"
          >
            登入
          </AsyncButton>
        </form>
      </div>
    </div>
  );
}
