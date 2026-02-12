'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login } from '@/features/auth/api';

type FormValues = {
  username: string;
  password: string;
};

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('return_to') ?? undefined;

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().min(1),
        password: z.string().min(1)
      }),
    []
  );

  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: 'demo', password: 'demo' }
  });

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          try {
            await login({ ...values, return_to: returnTo });
            router.push(returnTo ?? '/surveys');
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <div className="space-y-1">
          <label className="text-sm text-gray-700">Username</label>
          <input className="w-full rounded border px-3 py-2" {...register('username')} />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-700">Password</label>
          <input className="w-full rounded border px-3 py-2" type="password" {...register('password')} />
        </div>
        {error ? <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</div> : null}
        <button className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="text-sm text-gray-600">Demo account: demo / demo</div>
    </div>
  );
}
