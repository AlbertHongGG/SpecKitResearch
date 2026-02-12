'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, ApiError } from '../../lib/api-client';
import { getUserFacingErrorMessage } from '../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../lib/require-auth';

const zCreateProject = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

type CreateProjectValues = z.infer<typeof zCreateProject>;

type ProjectsResponse = {
  projects: Array<{
    id: string;
    name: string;
    status: 'active' | 'archived';
    visibility: 'private' | 'shared';
    version: number;
  }>;
  invitations: Array<{
    id: string;
    projectId: string;
    email: string;
    invitedRole: 'admin' | 'member' | 'viewer';
    status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  }>;
};

export default function ProjectsPage() {
  const me = useRequireAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const createForm = useForm<CreateProjectValues>({
    resolver: zodResolver(zCreateProject),
    defaultValues: { name: '', description: '' },
  });

  const createProject = useMutation({
    mutationFn: async (values: CreateProjectValues) => {
      const res = await apiFetch('/projects', {
        method: 'POST',
        json: { name: values.name, description: values.description ? values.description : null },
      });
      return res.data;
    },
    onSuccess: async () => {
      createForm.reset({ name: '', description: '' });
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiFetch(`/invitations/${invitationId}/accept`, { method: 'POST' });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const rejectInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      await apiFetch(`/invitations/${invitationId}/reject`, { method: 'POST' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const projects = useQuery({
    queryKey: ['projects'],
    enabled: !!me.data?.user,
    queryFn: async () => {
      const res = await apiFetch<ProjectsResponse>('/projects', { method: 'GET' });
      return res.data as ProjectsResponse;
    },
  });

  if (me.isLoading) {
    return <p className="text-slate-700">載入中…</p>;
  }

  if (me.error instanceof ApiError && me.error.statusCode === 401) {
    // Redirect happens in useRequireAuth effect.
    return <p className="text-slate-700">導向登入中…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">專案</h1>
        <Link href="/" className="text-sm text-slate-700 hover:text-slate-900">
          回首頁
        </Link>
      </div>

      {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">建立專案</h2>
          <button
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setShowCreate((v) => !v)}
            data-testid="toggle-create-project"
          >
            {showCreate ? '收起' : '新增'}
          </button>
        </div>

        {showCreate ? (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={createForm.handleSubmit(async (values) => {
              setActionError(null);
              try {
                await createProject.mutateAsync(values);
              } catch (err) {
                setActionError(getUserFacingErrorMessage(err, '建立失敗'));
              }
            })}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">Name</span>
              <input
                className="w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="My project"
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name ? (
                <span className="text-xs text-red-600">{createForm.formState.errors.name.message}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">Description（可選）</span>
              <textarea
                className="w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                {...createForm.register('description')}
              />
            </label>

            <div>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={createProject.isPending}
                data-testid="create-project-submit"
              >
                建立
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {projects.isLoading ? <p className="mt-4 text-slate-700">載入專案中…</p> : null}

      {projects.error ? (
        <p className="mt-4 text-sm text-red-600">
          {getUserFacingErrorMessage(projects.error, '載入失敗')}
        </p>
      ) : null}

      {projects.data ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">我的專案</h2>
            {projects.data.projects.length === 0 ? (
              <p className="mt-2 text-slate-700">目前沒有專案。</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="project-list">
                {projects.data.projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{p.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {p.id} · {p.visibility} · {p.status} · v{p.version}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => router.push(`/projects/${p.id}/members`)}
                        data-testid={`project-open-${p.id}`}
                      >
                        開啟
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">邀請</h2>
            {projects.data.invitations.length === 0 ? (
              <p className="mt-2 text-slate-700">目前沒有待處理邀請。</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="invitation-inbox">
                {projects.data.invitations.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                    <div className="min-w-0">
                      <div className="break-all text-sm text-slate-800">project: {inv.projectId}</div>
                      <div className="text-xs text-slate-500">
                        role: {inv.invitedRole} · status: {inv.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                        disabled={acceptInvitation.isPending}
                        onClick={async () => {
                          setActionError(null);
                          try {
                            await acceptInvitation.mutateAsync(inv.id);
                          } catch (err) {
                            setActionError(getUserFacingErrorMessage(err, '接受失敗'));
                          }
                        }}
                        data-testid={`inv-accept-${inv.id}`}
                      >
                        接受
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={rejectInvitation.isPending}
                        onClick={async () => {
                          setActionError(null);
                          try {
                            await rejectInvitation.mutateAsync(inv.id);
                          } catch (err) {
                            setActionError(getUserFacingErrorMessage(err, '拒絕失敗'));
                          }
                        }}
                        data-testid={`inv-reject-${inv.id}`}
                      >
                        拒絕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
