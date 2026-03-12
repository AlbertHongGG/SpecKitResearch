'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError, isApiError } from '@/lib/api/errors';

type Workflow = {
  statuses: Array<{ key: string; name: string; position: number }>;
  transitions: Array<{ fromStatusKey: string; toStatusKey: string }>;
};

export function TransitionMenu({
  projectId,
  issueKey,
  statusKey,
  expectedVersion,
  onTransitioned,
}: {
  projectId: string;
  issueKey: string;
  statusKey: string;
  expectedVersion: string;
  onTransitioned: () => void | Promise<void>;
}) {
  const [to, setTo] = useState('');

  const wfQ = useQuery({
    queryKey: ['workflow', projectId],
    queryFn: async () => apiFetch<{ workflow: Workflow }>(`/projects/${projectId}/workflows`),
    retry: false,
  });

  const allowedTargets = useMemo(() => {
    const wf = wfQ.data?.workflow;
    if (!wf) return [] as Array<{ key: string; name: string }>;

    const targets = wf.transitions.filter((t) => t.fromStatusKey === statusKey).map((t) => t.toStatusKey);
    const targetSet = new Set(targets);

    return wf.statuses
      .slice()
      .sort((a, b) => a.position - b.position)
      .filter((s) => targetSet.has(s.key))
      .map((s) => ({ key: s.key, name: s.name }));
  }, [wfQ.data, statusKey]);

  const m = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ toStatusKey: to, expectedVersion }),
      });

      return await apiFetch<{ updatedVersion: string }>(
        `/projects/${projectId}/issues/${encodeURIComponent(issueKey)}/transition`,
        init,
      );
    },
    onSuccess: async () => {
      setTo('');
      await onTransitioned();
    },
  });

  if (wfQ.isLoading) return null;
  if (wfQ.isError) return <div className="text-sm text-red-700">{formatApiError(wfQ.error)}</div>;

  if (allowedTargets.length === 0) return null;

  const transitionError = m.isError ? m.error : null;
  const transitionErrorMessage = transitionError
    ? isApiError(transitionError) && transitionError.status === 403 && transitionError.code === 'ISSUE_STATUS_DEPRECATED'
      ? 'This issue’s status is deprecated. Reload the page to get the latest workflow.'
      : formatApiError(transitionError)
    : null;

  return (
    <div className="flex items-center gap-2">
      <select className="rounded border p-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">Transition…</option>
        {allowedTargets.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={!to || m.isPending}
        onClick={() => m.mutate()}
      >
        Go
      </button>
      {transitionErrorMessage ? <div className="text-sm text-red-700">{transitionErrorMessage}</div> : null}
    </div>
  );
}
