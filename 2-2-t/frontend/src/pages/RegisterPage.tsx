import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError, apiPostJson } from '../api/http';
import { AuthResponseSchema } from '../api/schemas';
import { setAuthToken, setAuthUser } from '../state/auth.store';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['USER', 'PROVIDER']),
});

type FormData = z.infer<typeof Schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '', role: 'USER' },
  });

  function redirectAfterAuth(role: 'USER' | 'PROVIDER' | 'ADMIN') {
    if (role === 'PROVIDER') return '/provider/dashboard';
    if (role === 'ADMIN') return '/admin';
    return '/services';
  }

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const res = await apiPostJson('/auth/register', data, AuthResponseSchema);
      setAuthToken(res.accessToken);
      setAuthUser(res.user);
      navigate(redirectAfterAuth(res.user.role), { replace: true });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setApiError(e.message);
        return;
      }
      setApiError('Registration failed.');
    }
  };

  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">Register</h1>

      {apiError ? <p className="mt-3 text-sm text-red-600">{apiError}</p> : null}

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            className="mt-1 w-full rounded border px-3 py-2"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm" htmlFor="register-role">
            Role
          </label>
          <select
            id="register-role"
            className="mt-1 w-full rounded border px-3 py-2"
            {...form.register('role')}
          >
            <option value="USER">User</option>
            <option value="PROVIDER">Provider</option>
          </select>
        </div>

        <button
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
