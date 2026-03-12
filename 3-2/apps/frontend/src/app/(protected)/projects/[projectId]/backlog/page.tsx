'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { ErrorState, LoadingState } from '@/components/PageStates';
import { apiFetch } from '@/lib/api/client';
import { formatApiError } from '@/lib/api/errors';

type IssueSummary = {
  issueKey: string;
  title: string;
  statusKey: string;
};

export default function BacklogPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const q = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: async () => apiFetch<{ issues: IssueSummary[]; nextCursor: string | null }>(`/projects/${projectId}/backlog?limit=50`),
    retry: false,
  });

  if (q.isLoading) return <LoadingState label="Loading" />;
  if (q.isError) return <ErrorState title="Error" message={formatApiError(q.error)} />;

  const issues = q.data!.issues;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Backlog</h1>
      {issues.length === 0 ? <div className="text-sm text-slate-500">No backlog issues.</div> : null}
      <div className="space-y-2">
        {issues.map((i) => (
          <Link
            key={i.issueKey}
            href={`/projects/${projectId}/issues/${encodeURIComponent(i.issueKey)}`}
            className="block rounded border bg-white p-3 text-sm hover:bg-slate-50"
          >
            <div className="font-medium">{i.title}</div>
            <div className="text-xs text-slate-500">
              {i.issueKey} · {i.statusKey}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
