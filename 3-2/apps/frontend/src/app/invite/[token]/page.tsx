'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { AuthErrorBox } from '@/features/auth/AuthErrors';

const schema = z.object({
  displayName: z.string().min(1),
  password: z.string().min(8).optional(),
});

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      schema.parse({ displayName, password: password ? password : undefined });
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ displayName, password: password ? password : undefined }),
      });
      await apiFetch(`/invites/${encodeURIComponent(token)}/accept`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['session'] });
      window.location.href = '/orgs';
    },
  });

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">接受邀請</h1>
      <p className="mt-2 text-sm text-slate-600">若你尚未有帳號，請先設定顯示名稱與密碼。</p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block">
          <div className="text-sm text-slate-700">Display name</div>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-sm text-slate-700">Password（新帳號用，可留空）</div>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button
          className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={mutation.isPending}
        >
          接受邀請
        </button>

        <AuthErrorBox error={mutation.error} />
      </form>
    </main>
  );
}
