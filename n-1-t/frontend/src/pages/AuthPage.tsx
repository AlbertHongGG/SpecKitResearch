import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { isApiError } from '../api/http';
import { useSession } from '../hooks/useSession';
import { useAuthMutations } from '../hooks/mutations/useAuthMutations';
import { loginSchema, type LoginValues, registerSchema, type RegisterValues } from '../schemas/authSchemas';

type Mode = 'login' | 'register' | 'logout';

function safeDecodeReturnTo(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = useSession();
  const { registerMutation, loginMutation, logoutMutation } = useAuthMutations();

  const requestedMode = (searchParams.get('mode') as Mode | null) ?? null;
  const returnTo = useMemo(() => safeDecodeReturnTo(searchParams.get('returnTo')), [searchParams]);
  const defaultAfterAuth = returnTo ?? (session.user?.role === 'admin' ? '/admin/activities' : '/activities');

  const [mode, setMode] = useState<Exclude<Mode, 'logout'>>(requestedMode === 'register' ? 'register' : 'login');

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (requestedMode !== 'logout') return;
    if (logoutMutation.isPending) return;

    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/activities', { replace: true });
      },
    });
  }, [navigate, logoutMutation, requestedMode]);

  const errorMessage = (() => {
    const err = registerMutation.error ?? loginMutation.error ?? logoutMutation.error;
    if (!err) return null;
    return isApiError(err) ? err.message : 'Unknown error';
  })();

  if (requestedMode === 'logout') {
    return <div className="text-slate-700">登出中…</div>;
  }

  const isAuthed = !!session.user;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">登入/註冊</h1>
        {returnTo ? <div className="text-sm text-slate-600">登入後將返回：{returnTo}</div> : null}
      </div>

      {isAuthed ? (
        <div className="rounded border bg-slate-50 p-4 text-sm">
          <div className="font-medium">你已登入為 {session.user!.name}</div>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => navigate(defaultAfterAuth, { replace: true })}
            >
              前往下一步
            </button>
            <Link className="underline" to="/auth?mode=logout">
              登出
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded border px-3 py-1 text-sm ${mode === 'login' ? 'bg-slate-100' : ''}`}
          onClick={() => setMode('login')}
        >
          登入
        </button>
        <button
          type="button"
          className={`rounded border px-3 py-1 text-sm ${mode === 'register' ? 'bg-slate-100' : ''}`}
          onClick={() => setMode('register')}
        >
          註冊
        </button>
      </div>

      {errorMessage ? <div className="text-sm text-red-700">{errorMessage}</div> : null}

      {mode === 'login' ? (
        <form
          className="space-y-4"
          onSubmit={loginForm.handleSubmit((values) => {
            loginMutation.mutate(values, {
              onSuccess: (me) => {
                const target = returnTo ?? (me.role === 'admin' ? '/admin/activities' : '/activities');
                navigate(target, { replace: true });
              },
            });
          })}
        >
          <div className="space-y-1">
            <label className="block text-sm" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="w-full rounded border px-3 py-2"
              {...loginForm.register('email')}
            />
            {loginForm.formState.errors.email ? (
              <div className="text-sm text-red-700">{loginForm.formState.errors.email.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="block text-sm" htmlFor="login-password">
              密碼
            </label>
            <input
              id="login-password"
              type="password"
              className="w-full rounded border px-3 py-2"
              {...loginForm.register('password')}
            />
            {loginForm.formState.errors.password ? (
              <div className="text-sm text-red-700">{loginForm.formState.errors.password.message}</div>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full rounded border bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? '登入中…' : '登入'}
          </button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={registerForm.handleSubmit((values) => {
            registerMutation.mutate(values, {
              onSuccess: () => navigate(defaultAfterAuth, { replace: true }),
            });
          })}
        >
          <div className="space-y-1">
            <label className="block text-sm" htmlFor="register-name">
              姓名
            </label>
            <input
              id="register-name"
              type="text"
              className="w-full rounded border px-3 py-2"
              {...registerForm.register('name')}
            />
            {registerForm.formState.errors.name ? (
              <div className="text-sm text-red-700">{registerForm.formState.errors.name.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="block text-sm" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className="w-full rounded border px-3 py-2"
              {...registerForm.register('email')}
            />
            {registerForm.formState.errors.email ? (
              <div className="text-sm text-red-700">{registerForm.formState.errors.email.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="block text-sm" htmlFor="register-password">
              密碼
            </label>
            <input
              id="register-password"
              type="password"
              className="w-full rounded border px-3 py-2"
              {...registerForm.register('password')}
            />
            {registerForm.formState.errors.password ? (
              <div className="text-sm text-red-700">{registerForm.formState.errors.password.message}</div>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full rounded border bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? '註冊中…' : '註冊'}
          </button>
        </form>
      )}
    </div>
  );
}
