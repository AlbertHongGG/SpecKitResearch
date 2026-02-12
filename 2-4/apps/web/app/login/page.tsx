'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginResponseSchema } from '@acme/contracts';

import { apiFetch } from '../../src/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const returnTo = useMemo(() => params.get('return_to') ?? '/', [params]);

  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<unknown>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, return_to: returnTo }),
      });
      LoginResponseSchema.parse(data);
      router.push(returnTo);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null) {
        const maybeBody = (err as { body?: unknown }).body;
        if (typeof maybeBody === 'object' && maybeBody !== null) {
          const message = (maybeBody as { message?: unknown }).message;
          if (typeof message === 'string') {
            setError(message);
            return;
          }
        }
      }

      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-zinc-600">Use the seeded demo user to continue.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <div className="mb-1 text-zinc-700">Email</div>
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block text-sm">
          <div className="mb-1 text-zinc-700">Password</div>
          <input
            type="password"
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
