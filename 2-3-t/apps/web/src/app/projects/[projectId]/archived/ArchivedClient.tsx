'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { getUserFacingErrorMessage } from '../../../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../../../lib/require-auth';
import { useMyMembership } from '../../../../lib/use-membership';

type Snapshot = {
  project: { id: string; name: string; status: 'active' | 'archived' };
  boards: Array<{ id: string; name: string; order: number; status: 'active' | 'archived' }>;
  lists: Array<{ id: string; boardId: string; title: string; order: number; status: 'active' | 'archived' }>;
  tasks: any[];
  memberships: any[];
};

export default function ArchivedClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  useRequireAuth();
  const { memberships, isProjectAccessError } = useMyMembership(projectId);

  useEffect(() => {
    if (isProjectAccessError) router.replace('/403');
    const err = memberships.error;
    if (err instanceof ApiError && err.statusCode >= 500) router.replace('/5xx');
  }, [isProjectAccessError, memberships.error, router]);

  const snapshot = useQuery({
    queryKey: ['projects', projectId, 'snapshot'],
    enabled: !isProjectAccessError,
    queryFn: async () => {
      const res = await apiFetch<Snapshot>(`/projects/${projectId}/snapshot`, { method: 'GET' });
      return res.data as Snapshot;
    },
  });

  const archivedBoards = useMemo(() => {
    return (snapshot.data?.boards ?? []).filter((b) => b.status === 'archived').sort((a, b) => a.order - b.order);
  }, [snapshot.data?.boards]);

  const archivedLists = useMemo(() => {
    return (snapshot.data?.lists ?? []).filter((l) => l.status === 'archived').sort((a, b) => a.order - b.order);
  }, [snapshot.data?.lists]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">封存</h1>
        <button
          className="text-sm text-slate-700 underline"
          onClick={() => router.push(`/projects/${projectId}/board`)}
        >
          ← 回看板
        </button>
      </header>

      {snapshot.isLoading ? <p className="text-slate-700">載入中…</p> : null}
      {snapshot.error ? (
        <p className="text-sm text-red-600">{getUserFacingErrorMessage(snapshot.error, '載入失敗')}</p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">封存的 Boards</h2>
        {archivedBoards.length === 0 ? (
          <p className="mt-2 text-slate-700">目前沒有封存的 boards。</p>
        ) : (
          <ul className="mt-3 list-disc pl-5 text-slate-800" data-testid="archived-boards">
            {archivedBoards.map((b) => (
              <li key={b.id} className="break-all">
                {b.name} ({b.id})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">封存的 Lists</h2>
        {archivedLists.length === 0 ? (
          <p className="mt-2 text-slate-700">目前沒有封存的 lists。</p>
        ) : (
          <ul className="mt-3 list-disc pl-5 text-slate-800" data-testid="archived-lists">
            {archivedLists.map((l) => (
              <li key={l.id} className="break-all">
                {l.title} ({l.id})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
