'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';

type Workflow = {
  statuses: Array<{ key: string; name: string; position: number }>;
  transitions: Array<{ fromStatusKey: string; toStatusKey: string }>;
};

type IssueSummary = {
  issueKey: string;
  title: string;
  statusKey: string;
  updatedAt: string;
};

export function KanbanBoard({ projectId, workflow, issues }: { projectId: string; workflow: Workflow; issues: IssueSummary[] }) {
  const qc = useQueryClient();
  const [dndError, setDndError] = useState<string | null>(null);

  const statuses = useMemo(
    () => workflow.statuses.slice().sort((a, b) => a.position - b.position),
    [workflow.statuses],
  );

  const allowed = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const t of workflow.transitions) {
      if (!map.has(t.fromStatusKey)) map.set(t.fromStatusKey, new Set());
      map.get(t.fromStatusKey)!.add(t.toStatusKey);
    }
    return map;
  }, [workflow.transitions]);

  const byStatus = useMemo(() => {
    const map = new Map<string, IssueSummary[]>();
    for (const s of statuses) map.set(s.key, []);
    for (const i of issues) {
      if (!map.has(i.statusKey)) map.set(i.statusKey, []);
      map.get(i.statusKey)!.push(i);
    }
    return map;
  }, [issues, statuses]);

  const transition = useMutation({
    mutationFn: async (params: { issueKey: string; toStatusKey: string; expectedVersion: string }) => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ toStatusKey: params.toStatusKey, expectedVersion: params.expectedVersion }),
      });

      return await apiFetch(`/projects/${projectId}/issues/${encodeURIComponent(params.issueKey)}/transition`, init);
    },
    onSuccess: async () => {
      setDndError(null);
      await qc.invalidateQueries({ queryKey: ['issues', projectId] });
      await qc.invalidateQueries({ queryKey: ['audit', projectId] });
    },
    onError: (e) => {
      setDndError(formatApiError(e));
    },
  });

  return (
    <div>
      {dndError ? <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{dndError}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {statuses.map((s) => (
          <section
            key={s.key}
            data-testid={`kanban-column-${s.key}`}
            className="rounded border bg-white"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const payload = e.dataTransfer.getData('application/json');
              if (!payload) return;

              let data: { issueKey: string; fromStatusKey: string; expectedVersion: string } | null = null;
              try {
                data = JSON.parse(payload);
              } catch {
                data = null;
              }
              if (!data) return;
              if (data.fromStatusKey === s.key) return;

              const allowedTargets = allowed.get(data.fromStatusKey);
              if (!allowedTargets?.has(s.key)) {
                setDndError('Transition not allowed');
                return;
              }

              transition.mutate({ issueKey: data.issueKey, toStatusKey: s.key, expectedVersion: data.expectedVersion });
            }}
          >
            <div className="border-b p-3 text-sm font-medium text-slate-700">{s.name}</div>
            <div className="space-y-2 p-3">
              {(byStatus.get(s.key) ?? []).map((i) => (
                <Link
                  key={i.issueKey}
                  href={`/projects/${projectId}/issues/${encodeURIComponent(i.issueKey)}`}
                  draggable
                  onDragStart={(e) => {
                    setDndError(null);
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ issueKey: i.issueKey, fromStatusKey: i.statusKey, expectedVersion: i.updatedAt }),
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="block rounded border p-2 text-sm hover:bg-slate-50"
                >
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-slate-500">{i.issueKey}</div>
                </Link>
              ))}
              {(byStatus.get(s.key) ?? []).length === 0 ? <div className="text-sm text-slate-500">Empty</div> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
