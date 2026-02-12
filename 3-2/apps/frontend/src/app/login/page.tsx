'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { apiFetch } from '@/lib/api/client';
import { withCsrf, clearCsrfTokenCache } from '@/lib/api/csrf';
import { sanitizeReturnTo } from '@/lib/routing/returnTo';
import { AuthErrorBox } from '@/features/auth/AuthErrors';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default function LoginPage() {
  const params = useSearchParams();
  const returnTo = sanitizeReturnTo(params.get('returnTo'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      schema.parse({ email, password });
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await apiFetch('/auth/login', init);
    },
    onSuccess: async () => {
      clearCsrfTokenCache();
      await qc.invalidateQueries({ queryKey: ['session'] });
      window.location.href = returnTo ?? '/orgs';
    },
  });

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">登入</h1>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block">
          <div className="text-sm text-slate-700">Email</div>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <div className="text-sm text-slate-700">Password</div>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button
          className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={mutation.isPending}
        >
          登入
        </button>

        <AuthErrorBox error={mutation.error} />
      </form>
    </main>
  );
}
