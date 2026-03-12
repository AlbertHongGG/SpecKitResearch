'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorState, LoadingState } from '@/components/PageStates';
import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { SprintActions } from '@/features/sprints/SprintActions';

type Sprint = {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'closed';
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
};

export default function SprintsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const qc = useQueryClient();

  const [name, setName] = useState('');

  const q = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async () => apiFetch<{ sprints: Sprint[] }>(`/projects/${projectId}/sprints`),
    retry: false,
  });

  const createM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      return await apiFetch<{ sprintId: string }>(`/projects/${projectId}/sprints`, init);
    },
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      await qc.invalidateQueries({ queryKey: ['audit', projectId] });
    },
  });

  if (q.isLoading) return <LoadingState label="Loading" />;
  if (q.isError) return <ErrorState title="Error" message={formatApiError(q.error)} />;

  const sprints = q.data!.sprints;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Sprints</h1>

      <section className="mb-6 rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-700">Create sprint</h2>
        <label className="block text-sm">
          <span className="text-slate-600">Sprint name</span>
          <input
            className="mt-1 w-full rounded border p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint 1"
          />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!name.trim() || createM.isPending}
            onClick={() => createM.mutate()}
          >
            Create sprint
          </button>
          {createM.isError ? <div className="text-sm text-red-700">{formatApiError(createM.error)}</div> : null}
        </div>
      </section>

      {sprints.length === 0 ? <div className="text-sm text-slate-500">No sprints yet.</div> : null}

      <div className="space-y-3">
        {sprints.map((s) => (
          <section key={s.id} className="rounded border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-slate-500">Status: {s.status}</div>
              </div>
              <SprintActions projectId={projectId} sprint={s} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
