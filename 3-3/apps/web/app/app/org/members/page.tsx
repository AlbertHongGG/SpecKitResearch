'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { z } from 'zod';
import { AsyncState } from '../../../../src/components/AsyncState';
import { RequireOrgRole } from '../../../../src/features/auth/requireRole';
import { apiFetch } from '../../../../src/lib/api';

type Member = {
  id: string;
  email: string;
  role: 'END_USER' | 'ORG_ADMIN';
  status: 'ACTIVE' | 'REMOVED';
};

type MembersResponse = { members: Member[] };

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['END_USER', 'ORG_ADMIN']),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function MembersPage() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['app', 'org', 'members'],
    queryFn: () => apiFetch<MembersResponse>('/app/org/members'),
  });

  const invite = useMutation({
    mutationFn: async (input: InviteForm) => {
      const parsed = inviteSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.message);
      return apiFetch<Member>('/app/org/members', { method: 'POST', body: JSON.stringify(parsed.data) });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app', 'org', 'members'] });
    },
  });

  const patchRole = useMutation({
    mutationFn: async (input: { memberId: string; role: 'END_USER' | 'ORG_ADMIN' }) => {
      return apiFetch<Member>(`/app/org/members/${encodeURIComponent(input.memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: input.role }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app', 'org', 'members'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      await apiFetch<void>(`/app/org/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app', 'org', 'members'] });
    },
  });

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'END_USER' | 'ORG_ADMIN'>('END_USER');

  return (
    <RequireOrgRole role="ORG_ADMIN">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
        <p className="mt-1 text-sm text-zinc-600">Invite and manage organization members.</p>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Invite</div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                className="md:col-span-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <select
                className="md:col-span-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="END_USER">END_USER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
              </select>
              <button
                className="md:col-span-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={invite.isPending}
                onClick={() => invite.mutate({ email, role })}
              >
                {invite.isPending ? 'Inviting…' : 'Invite'}
              </button>
            </div>
            {invite.error ? <div className="mt-3 text-sm text-red-700">{(invite.error as Error).message}</div> : null}
          </div>

          <AsyncState
            isLoading={list.isLoading}
            error={list.error}
            isEmpty={!list.isLoading && !list.error && (list.data?.members?.length ?? 0) === 0}
            empty="No members."
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">Current members</div>
              <div className="mt-3 divide-y divide-zinc-100">
                {(list.data?.members ?? []).map((m) => (
                  <div key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{m.email}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {m.id} • {m.status}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm"
                        value={m.role}
                        disabled={patchRole.isPending || m.status !== 'ACTIVE'}
                        onChange={(e) => patchRole.mutate({ memberId: m.id, role: e.target.value as any })}
                      >
                        <option value="END_USER">END_USER</option>
                        <option value="ORG_ADMIN">ORG_ADMIN</option>
                      </select>

                      <button
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 disabled:opacity-60"
                        disabled={remove.isPending || m.status !== 'ACTIVE'}
                        onClick={() => remove.mutate(m.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {patchRole.error ? <div className="mt-3 text-sm text-red-700">{(patchRole.error as Error).message}</div> : null}
              {remove.error ? <div className="mt-3 text-sm text-red-700">{(remove.error as Error).message}</div> : null}
            </div>
          </AsyncState>
        </div>
      </div>
    </RequireOrgRole>
  );
}
