'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError, isApiError } from '@/lib/api/errors';

type IssueDetail = {
  title: string;
  description: string | null;
  priority: string;
  updatedAt: string;
};

type FormValues = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export function IssueEditForm({
  projectId,
  issueKey,
  initial,
  onSaved,
}: {
  projectId: string;
  issueKey: string;
  initial: IssueDetail;
  onSaved: () => void | Promise<void>;
}) {
  const [conflict, setConflict] = useState<string | null>(null);

  const defaults = useMemo<FormValues>(
    () => ({
      title: initial.title,
      description: initial.description ?? '',
      priority: (initial.priority as any) ?? 'medium',
    }),
    [initial.title, initial.description, initial.priority],
  );

  const form = useForm<FormValues>({ defaultValues: defaults, values: defaults });

  const m = useMutation({
    mutationFn: async (values: FormValues) => {
      setConflict(null);
      const init = await withCsrf({
        method: 'PATCH',
        body: JSON.stringify({
          expectedVersion: initial.updatedAt,
          patch: {
            title: values.title,
            description: values.description || null,
            priority: values.priority,
          },
        }),
      });

      return await apiFetch<{ updatedVersion: string }>(
        `/projects/${projectId}/issues/${encodeURIComponent(issueKey)}`,
        init,
      );
    },
    onSuccess: async () => {
      await onSaved();
    },
    onError: (err) => {
      if (isApiError(err) && err.status === 409) {
        setConflict('This issue was updated by someone else. Refresh and try again.');
      }
    },
  });

  return (
    <form className="flex flex-col gap-2" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
      <label className="text-sm">
        <div className="mb-1 text-xs text-slate-600">Title</div>
        <input className="w-full rounded border p-2" {...form.register('title', { required: true })} />
      </label>

      <label className="text-sm">
        <div className="mb-1 text-xs text-slate-600">Description</div>
        <textarea className="w-full rounded border p-2" rows={4} {...form.register('description')} />
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

      {conflict ? <div className="text-sm text-amber-700">{conflict}</div> : null}
      {m.isError && !conflict ? <div className="text-sm text-red-700">{formatApiError(m.error)}</div> : null}

      <button
        type="submit"
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={m.isPending}
      >
        Save
      </button>
    </form>
  );
}
