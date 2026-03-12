'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';

type Sprint = {
  id: string;
  status: 'planned' | 'active' | 'closed';
};

export function SprintActions({ projectId, sprint }: { projectId: string; sprint: Sprint }) {
  const qc = useQueryClient();

  const startM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST' });
      return await apiFetch(`/projects/${projectId}/sprints/${encodeURIComponent(sprint.id)}/start`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      await qc.invalidateQueries({ queryKey: ['audit', projectId] });
    },
  });

  const closeM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST' });
      return await apiFetch(`/projects/${projectId}/sprints/${encodeURIComponent(sprint.id)}/close`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      await qc.invalidateQueries({ queryKey: ['audit', projectId] });
    },
  });

  const err = (startM.isError ? startM.error : null) ?? (closeM.isError ? closeM.error : null);

  return (
    <div className="flex items-center gap-2">
      {sprint.status === 'planned' ? (
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={startM.isPending}
          onClick={() => startM.mutate()}
        >
          Start
        </button>
      ) : null}
      {sprint.status === 'active' ? (
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={closeM.isPending}
          onClick={() => closeM.mutate()}
        >
          Close
        </button>
      ) : null}
      {err ? <div className="text-sm text-red-700">{formatApiError(err)}</div> : null}
    </div>
  );
}
