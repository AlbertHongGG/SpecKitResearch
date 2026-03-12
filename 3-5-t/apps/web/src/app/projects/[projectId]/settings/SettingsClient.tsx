'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '../../../../lib/api-client';
import { getUserFacingErrorMessage } from '../../../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../../../lib/require-auth';
import { useMyMembership } from '../../../../lib/use-membership';

type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  visibility: 'private' | 'shared';
  status: 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = {
  projects: Project[];
  invitations: unknown[];
};

export default function SettingsClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useRequireAuth();

  const membership = useMyMembership(projectId);

  useEffect(() => {
    if (!membership.memberships.error) return;
    const err = membership.memberships.error;
    if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) {
      router.replace('/403');
    } else if (err instanceof ApiError && err.statusCode >= 500) {
      router.replace('/5xx');
    }
  }, [membership.memberships.error, router]);

  const projects = useQuery({
    queryKey: ['projects'],
    enabled: !!membership.me.data?.user,
    queryFn: async () => {
      const res = await apiFetch<ProjectsResponse>('/projects', { method: 'GET' });
      return res.data as ProjectsResponse;
    },
  });

  const project = useMemo(() => {
    const list = projects.data?.projects ?? [];
    return list.find((p) => p.id === projectId) ?? null;
  }, [projectId, projects.data?.projects]);

  const updateProject = useMutation({
    mutationFn: async (input: { version: number; visibility?: 'private' | 'shared' }) => {
      const res = await apiFetch<Project>(`/projects/${projectId}`,
        {
          method: 'PATCH',
          json: { version: input.version, visibility: input.visibility },
        },
      );
      return res.data as Project;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const archiveProject = useMutation({
    mutationFn: async (input: { version: number; reason?: string | null }) => {
      const res = await apiFetch<Project>(`/projects/${projectId}/archive`, {
        method: 'POST',
        json: { version: input.version, reason: input.reason ?? null },
      });
      return res.data as Project;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (projects.isLoading) return <p className="text-slate-700">載入中…</p>;

  if (projects.error) {
    const err = projects.error;
    return <p className="text-sm text-red-600">{getUserFacingErrorMessage(err, '載入失敗')}</p>;
  }

  if (!project) {
    return <p className="text-slate-700">找不到此專案（可能已被移除或你沒有權限）。</p>;
  }

  const isOwner = membership.role === 'owner';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="mt-1 text-sm text-slate-600">{project.name}</p>
      </header>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">專案狀態</h2>
        <div className="mt-2 text-sm text-slate-700">status: {project.status} · v{project.version}</div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Visibility</h2>
        {!isOwner ? (
          <p className="mt-2 text-slate-700">只有 Owner 可以修改專案設定。</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={project.visibility}
              disabled={updateProject.isPending || project.status === 'archived'}
              onChange={async (e) => {
                setActionError(null);
                try {
                  await updateProject.mutateAsync({ version: project.version, visibility: e.target.value as any });
                } catch (err) {
                  setActionError(getUserFacingErrorMessage(err, '更新失敗'));
                }
              }}
              data-testid="project-visibility"
            >
              <option value="private">private</option>
              <option value="shared">shared</option>
            </select>

            {project.status === 'archived' ? <span className="text-sm text-slate-500">（已封存，唯讀）</span> : null}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Archive</h2>
        {!isOwner ? (
          <p className="mt-2 text-slate-700">只有 Owner 可以封存專案。</p>
        ) : project.status === 'archived' ? (
          <p className="mt-2 text-slate-700">此專案已封存。</p>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">Reason（可選）</span>
              <input
                className="w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="為什麼要封存？"
              />
            </label>

            <button
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              disabled={archiveProject.isPending}
              onClick={async () => {
                setActionError(null);
                if (!confirm('封存後將進入唯讀，確定要封存嗎？')) return;
                try {
                  await archiveProject.mutateAsync({ version: project.version, reason: reason || null });
                } catch (err) {
                  setActionError(getUserFacingErrorMessage(err, '封存失敗'));
                }
              }}
              data-testid="project-archive"
            >
              封存專案
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
