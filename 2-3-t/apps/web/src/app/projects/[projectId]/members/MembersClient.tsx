'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ApiError, apiFetch } from '../../../../lib/api-client';
import { getUserFacingErrorMessage } from '../../../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../../../lib/require-auth';
import { useMyMembership, type ProjectMembership, type ProjectRole } from '../../../../lib/use-membership';

const zInvite = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

type InviteValues = z.infer<typeof zInvite>;

type InvitationsResponse = {
  invitations: Array<{
    id: string;
    projectId: string;
    email: string;
    invitedRole: 'admin' | 'member' | 'viewer';
    status: 'pending' | 'accepted' | 'rejected' | 'revoked';
    createdAt: string;
    respondedAt: string | null;
  }>;
};

export default function MembersClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useRequireAuth();

  const { memberships, role, can } = useMyMembership(projectId);

  useEffect(() => {
    const err = memberships.error;
    if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) {
      router.replace('/403');
    } else if (err instanceof ApiError && err.statusCode >= 500) {
      router.replace('/5xx');
    }
  }, [memberships.error, router]);

  const invitations = useQuery({
    queryKey: ['projects', projectId, 'invitations'],
    enabled: can.membershipWrite,
    queryFn: async () => {
      const res = await apiFetch<InvitationsResponse>(`/projects/${projectId}/invitations`, { method: 'GET' });
      return res.data as InvitationsResponse;
    },
  });

  const pendingInvitations = useMemo(() => {
    const list = invitations.data?.invitations ?? [];
    return list.filter((i) => i.status === 'pending');
  }, [invitations.data?.invitations]);

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(zInvite),
    defaultValues: { role: 'member' },
  });

  const createInvitation = useMutation({
    mutationFn: async (values: InviteValues) => {
      const res = await apiFetch(`/projects/${projectId}/invitations`, { method: 'POST', json: values });
      return res.data;
    },
    onSuccess: async () => {
      inviteForm.reset({ email: '', role: 'member' });
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'invitations'] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async (input: { membershipId: string; version: number; role: Exclude<ProjectRole, 'owner'> }) => {
      const res = await apiFetch<ProjectMembership>(`/projects/${projectId}/memberships/${input.membershipId}`, {
        method: 'PATCH',
        json: { version: input.version, role: input.role },
      });
      return res.data as ProjectMembership;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'memberships'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      await apiFetch(`/projects/${projectId}/memberships/${membershipId}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'memberships'] });
    },
  });

  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">成員</h1>
        <div className="text-sm text-slate-600">你的角色：{role ?? '—'}</div>
      </header>

      {memberships.isLoading ? <p className="text-slate-700">載入中…</p> : null}

      {memberships.error ? (
        <p className="text-sm text-red-600">
          {getUserFacingErrorMessage(memberships.error, '載入失敗')}
        </p>
      ) : null}

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">成員列表</h2>
        {memberships.data?.memberships?.length ? (
          <ul className="mt-3 space-y-2" data-testid="membership-list">
            {memberships.data.memberships.map((m) => {
              const isOwner = m.role === 'owner';
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                  <div className="min-w-0">
                    <div className="break-all text-sm text-slate-800">{m.userId}</div>
                    <div className="text-xs text-slate-500">
                      role: {m.role} · v{m.version}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <span className="text-xs text-slate-500">Owner</span>
                    ) : (
                      <select
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                        value={m.role}
                        disabled={!can.membershipWrite || updateRole.isPending}
                        onChange={async (e) => {
                          setActionError(null);
                          const nextRole = e.target.value as Exclude<ProjectRole, 'owner'>;
                          try {
                            await updateRole.mutateAsync({ membershipId: m.id, version: m.version, role: nextRole });
                          } catch (err) {
                            setActionError(getUserFacingErrorMessage(err, '更新失敗'));
                          }
                        }}
                      >
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                        <option value="viewer">viewer</option>
                      </select>
                    )}

                    {!isOwner ? (
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={!can.membershipWrite || removeMember.isPending}
                        onClick={async () => {
                          setActionError(null);
                          if (!confirm('確定要移除此成員？')) return;
                          try {
                            await removeMember.mutateAsync(m.id);
                          } catch (err) {
                            setActionError(getUserFacingErrorMessage(err, '移除失敗'));
                          }
                        }}
                      >
                        移除
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-slate-700">沒有成員資料。</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">邀請</h2>
        {!can.membershipWrite ? (
          <p className="mt-2 text-slate-700">只有 Owner/Admin 可以邀請或管理邀請。</p>
        ) : (
          <>
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={inviteForm.handleSubmit(async (values) => {
                setActionError(null);
                try {
                  await createInvitation.mutateAsync(values);
                } catch (err) {
                  setActionError(getUserFacingErrorMessage(err, '邀請失敗'));
                }
              })}
            >
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-700">Email</span>
                <input
                  className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="user@example.com"
                  {...inviteForm.register('email')}
                />
                {inviteForm.formState.errors.email ? (
                  <span className="text-xs text-red-600">{inviteForm.formState.errors.email.message}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-700">Role</span>
                <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" {...inviteForm.register('role')}>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                </select>
              </label>

              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={createInvitation.isPending}
                data-testid="invite-submit"
              >
                送出邀請
              </button>
            </form>

            {invitations.isLoading ? <p className="mt-4 text-slate-700">載入邀請中…</p> : null}
            {invitations.error ? (
              <p className="mt-4 text-sm text-red-600">
                {getUserFacingErrorMessage(invitations.error, '載入失敗')}
              </p>
            ) : null}

            {invitations.data ? (
              <div className="mt-4">
                <div className="text-sm font-medium text-slate-800">待處理邀請</div>
                {pendingInvitations.length === 0 ? (
                  <p className="mt-2 text-slate-700">目前沒有 pending 邀請。</p>
                ) : (
                  <ul className="mt-2 list-disc pl-5 text-slate-800" data-testid="pending-invitations">
                    {pendingInvitations.map((inv) => (
                      <li key={inv.id}>
                        {inv.email} ({inv.invitedRole})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
