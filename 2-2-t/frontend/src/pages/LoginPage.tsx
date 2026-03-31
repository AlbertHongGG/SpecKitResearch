import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError, apiPostJson } from '../api/http';
import { AuthResponseSchema } from '../api/schemas';
import { setAuthToken, setAuthUser } from '../state/auth.store';
import { ForgotPasswordForm, ResetPasswordForm } from '../features/password-reset';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormData = z.infer<typeof Schema>;

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('returnTo');
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw === '/') return null;
    return raw;
  }, [location.search]);

  const view = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('token')) return 'reset';
    if (params.get('mode') === 'forgot') return 'forgot';
    return 'login';
  }, [location.search]);

  const resetToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') ?? undefined;
  }, [location.search]);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  });

  function redirectAfterAuth(role: 'USER' | 'PROVIDER' | 'ADMIN') {
    if (returnTo) return returnTo;
    if (role === 'PROVIDER') return '/provider/dashboard';
    if (role === 'ADMIN') return '/admin';
    return '/services';
  }

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const res = await apiPostJson('/auth/login', data, AuthResponseSchema);
      setAuthToken(res.accessToken);
      setAuthUser(res.user);
      navigate(redirectAfterAuth(res.user.role), { replace: true });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setApiError(e.message);
        return;
      }
      setApiError('Login failed.');
    }
  };

  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">Login</h1>

      {view === 'forgot' ? (
        <div className="mt-4">
          <ForgotPasswordForm onBack={() => navigate('/login', { replace: true })} />
        </div>
      ) : view === 'reset' ? (
        <div className="mt-4">
          <ResetPasswordForm
            token={resetToken}
            onDone={() => navigate('/login', { replace: true })}
          />
        </div>
      ) : (
        <>
          {apiError ? <p className="mt-3 text-sm text-red-600">{apiError}</p> : null}

          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className="mt-1 w-full rounded border px-3 py-2"
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="mt-1 w-full rounded border px-3 py-2"
                type="password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <button
              className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>

          <div className="mt-3 text-sm">
            <button
              type="button"
              className="underline"
              onClick={() => navigate('/login?mode=forgot', { replace: true })}
            >
              Forgot password?
            </button>
          </div>
        </>
      )}
    </div>
  );
}
