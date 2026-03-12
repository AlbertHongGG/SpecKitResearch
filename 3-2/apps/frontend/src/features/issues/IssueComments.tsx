'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError, isApiError } from '@/lib/api/errors';
import { sanitizeText } from '@/lib/security/sanitize';

type Comment = {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: string;
};

export function IssueComments({
  projectId,
  issueKey,
  canPost = true,
  onChanged,
}: {
  projectId: string;
  issueKey: string;
  canPost?: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const q = useQuery({
    queryKey: ['issue-comments', projectId, issueKey],
    queryFn: async () => apiFetch<{ comments: Comment[]; nextCursor: string | null }>(
      `/projects/${projectId}/issues/${encodeURIComponent(issueKey)}/comments`,
    ),
    retry: false,
  });

  const m = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST', body: JSON.stringify({ body }) });
      return await apiFetch<{ commentId: string }>(
        `/projects/${projectId}/issues/${encodeURIComponent(issueKey)}/comments`,
        init,
      );
    },
    onSuccess: async () => {
      setBody('');
      await qc.invalidateQueries({ queryKey: ['issue-comments', projectId, issueKey] });
      await onChanged();
    },
  });

  const canPostByApi = !(m.isError && isApiError(m.error) && m.error.status === 403);
  const allowComposer = canPost && canPostByApi;

  if (q.isLoading) return <div className="text-sm text-slate-600">Loading…</div>;
  if (q.isError) return <div className="text-sm text-red-700">{formatApiError(q.error)}</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {q.data!.comments.length === 0 ? <div className="text-sm text-slate-500">No comments yet.</div> : null}
        {q.data!.comments.map((c) => (
          <div key={c.id} className="rounded border bg-slate-50 p-3">
            <div className="mb-1 text-xs text-slate-500">
              {new Date(c.createdAt).toLocaleString()} · {c.authorUserId}
            </div>
            <div className="whitespace-pre-wrap text-sm text-slate-800">{sanitizeText(c.body)}</div>
          </div>
        ))}
      </div>

      {allowComposer ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment…"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!body.trim() || m.isPending}
              onClick={() => m.mutate()}
            >
              Post
            </button>
            {m.isError ? <div className="text-sm text-red-700">{formatApiError(m.error)}</div> : null}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">You don’t have permission to comment.</div>
      )}
    </div>
  );
}
