'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { ErrorState, LoadingState, EmptyState } from '@/components/PageStates';

type Project = {
  id: string;
  key: string;
  name: string;
  type: 'scrum' | 'kanban';
  status: 'active' | 'archived';
};

export default function OrgProjectsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const q = useQuery({
    queryKey: ['org-projects', orgId],
    queryFn: async () => {
      return await apiFetch<{ projects: Project[] }>(`/orgs/${encodeURIComponent(orgId)}/projects`);
    },
    retry: false,
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState title="載入失敗" message={String((q.error as any)?.message ?? '')} />;

  if (!q.data) return <ErrorState title="載入失敗" message="No data" />;

  const projects = q.data.projects;
  if (!projects.length) return <EmptyState title="尚無專案" description="請請 Org Admin 建立專案。" />;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Projects</h1>
      <ul className="mt-4 space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.key}: {p.name}</div>
                <div className="text-sm text-slate-600">{p.type} / {p.status}</div>
              </div>
              <a className="text-sm text-blue-700 underline" href={`/projects/${p.id}/board`}>
                Board
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
