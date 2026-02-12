import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/httpClient';
import type { AuthResponse } from '../api/types';
import { toToastError } from '../api/errors';
import { pushToast } from '../components/feedback/toastStore';
import { loginSchema, type LoginFormValues } from '../lib/zodSchemas';
import { setToken, useAuth } from '../auth/authStore';

function FieldError(props: { message?: string }) {
  if (!props.message) return null;
  return <div className="mt-1 text-xs text-red-700">{props.message}</div>;
}

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const from = (location.state as any)?.from as string | undefined;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (token) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-gray-900">已登入</h1>
        <p className="mt-2 text-sm text-gray-600">你已經登入，可以回到活動列表。</p>
        <div className="mt-4">
          <Link className="text-sm text-indigo-600 underline" to="/">
            回到首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-bold text-gray-900">登入</h1>
      <p className="mt-1 text-sm text-gray-600">使用 Email 與密碼登入。</p>

      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const res = await apiFetch<AuthResponse>('/auth/login', {
              method: 'POST',
              json: values,
            });
            setToken(res.token);
            pushToast({ type: 'success', message: `歡迎回來，${res.user.name}` });
            nav(from ?? '/', { replace: true });
          } catch (err) {
            pushToast({ type: 'error', ...toToastError(err, '登入失敗') });
          }
        })}
      >
        <div>
          <label className="block text-sm font-medium text-gray-800">Email</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            type="email"
            autoComplete="email"
            {...form.register('email')}
          />
          <FieldError message={form.formState.errors.email?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">密碼</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            登入
          </button>
          <Link to="/register" className="text-sm text-indigo-600 underline">
            沒有帳號？去註冊
          </Link>
        </div>
      </form>
    </div>
  );
}
