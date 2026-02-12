'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../lib/validation';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';
import { useSession } from '../../features/auth/use-session';

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { setUser } = useSession();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    const user = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    setUser(user);
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') ?? '/';
    window.location.href = redirect;
  };

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">登入</h1>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm">Email</label>
          <input className="w-full rounded border px-3 py-2" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm">密碼</label>
          <input type="password" className="w-full rounded border px-3 py-2" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          登入
        </button>
      </form>
    </div>
  );
}
