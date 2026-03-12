"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMembers } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

type MemberItem = { id: string; role: string; status: string; user: { email: string } };

export default function MembersPage() {
  const queryClient = useQueryClient();
  const { organizationId } = useSession();
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'END_USER' | 'ORG_ADMIN'>('END_USER');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useMembers();
  const items: MemberItem[] = Array.isArray(data) ? (data as MemberItem[]) : [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['members', organizationId] });
  };

  const onInvite = async () => {
    await apiFetch('/org/members', { method: 'POST', body: JSON.stringify({ userId: inviteUserId, role: inviteRole }) }, organizationId);
    setInviteUserId('');
    await refresh();
  };

  const onChangeRole = async (id: string, role: 'END_USER' | 'ORG_ADMIN') => {
    setBusyId(id);
    try {
      await apiFetch(`/org/members/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, organizationId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/org/members/${id}`, { method: 'DELETE' }, organizationId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Members</h1>
        <div className="card space-y-2">
          <h2 className="font-medium">Invite Member</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded border px-2 py-1"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="Existing userId"
            />
            <select className="rounded border px-2 py-1" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'END_USER' | 'ORG_ADMIN')}>
              <option value="END_USER">END_USER</option>
              <option value="ORG_ADMIN">ORG_ADMIN</option>
            </select>
            <button className="rounded bg-black px-3 py-1 text-white" disabled={!inviteUserId.trim()} onClick={onInvite}>
              Invite
            </button>
          </div>
        </div>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && items.length === 0 ? <EmptyState title="目前沒有成員" /> : null}
        {items.map((item) => (
          <article className="card space-y-2" key={item.id}>
            <p>{item.user.email}</p>
            <p className="text-sm text-gray-600">{item.role} / {item.status}</p>
            <div className="flex gap-2">
              <button className="rounded border px-2 py-1 text-xs" disabled={busyId === item.id} onClick={() => onChangeRole(item.id, 'END_USER')}>
                Set END_USER
              </button>
              <button className="rounded border px-2 py-1 text-xs" disabled={busyId === item.id} onClick={() => onChangeRole(item.id, 'ORG_ADMIN')}>
                Set ORG_ADMIN
              </button>
              <button className="rounded border px-2 py-1 text-xs" disabled={busyId === item.id} onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
