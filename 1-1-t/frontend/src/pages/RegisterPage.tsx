import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { setToken, useAuth } from '../auth/authStore';
import { toToastError } from '../api/errors';
import { apiFetch } from '../api/httpClient';
import type { AuthResponse } from '../api/types';
import { pushToast } from '../components/feedback/toastStore';
import { registerSchema, type RegisterFormValues } from '../lib/zodSchemas';

function FieldError(props: { message?: string }) {
  if (!props.message) return null;
  return <div className="mt-1 text-xs text-red-700">{props.message}</div>;
}

export function RegisterPage() {
  const nav = useNavigate();
  const { token } = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  if (token) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-gray-900">已登入</h1>
        <p className="mt-2 text-sm text-gray-600">你已經登入，不需要再註冊。</p>
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
      <h1 className="text-xl font-bold text-gray-900">註冊</h1>
      <p className="mt-1 text-sm text-gray-600">建立帳號後可直接登入。</p>

      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const res = await apiFetch<AuthResponse>('/auth/register', {
              method: 'POST',
              json: values,
            });
            setToken(res.token);
            pushToast({ type: 'success', message: `註冊成功，歡迎 ${res.user.name}` });
            nav('/', { replace: true });
          } catch (err) {
            pushToast({ type: 'error', ...toToastError(err, '註冊失敗') });
          }
        })}
      >
        <div>
          <label className="block text-sm font-medium text-gray-800">姓名</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            autoComplete="name"
            {...form.register('name')}
          />
          <FieldError message={form.formState.errors.name?.message} />
        </div>

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
            autoComplete="new-password"
            {...form.register('password')}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            註冊
          </button>
          <Link to="/login" className="text-sm text-indigo-600 underline">
            已有帳號？去登入
          </Link>
        </div>
      </form>
    </div>
  );
}
