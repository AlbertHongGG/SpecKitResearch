'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';

type FormValues = {
  type: 'story' | 'task' | 'bug' | 'epic';
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export function CreateIssueDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    defaultValues: { type: 'task', title: '', priority: 'medium' },
  });

  const m = useMutation({
    mutationFn: async (values: FormValues) => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify(values),
      });
      return await apiFetch<{ issueKey: string }>(`/projects/${projectId}/issues`, init);
    },
    onSuccess: async () => {
      form.reset();
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => setOpen((v) => !v)}
      >
        Create issue
      </button>

      {open ? (
        <div className="rounded border bg-white p-3">
          <form
            className="flex flex-col gap-2"
            onSubmit={form.handleSubmit((values) => m.mutate(values))}
          >
            <label className="text-sm">
              <div className="mb-1 text-xs text-slate-600">Type</div>
              <select className="w-full rounded border p-2" {...form.register('type')}>
                <option value="task">Task</option>
                <option value="story">Story</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs text-slate-600">Title</div>
              <input className="w-full rounded border p-2" {...form.register('title', { required: true })} />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs text-slate-600">Priority</div>
              <select className="w-full rounded border p-2" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            {m.isError ? <div className="text-sm text-red-700">{formatApiError(m.error)}</div> : null}

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={m.isPending}
              >
                Create
              </button>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
