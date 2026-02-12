'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createSurvey, listSurveys } from '../../src/features/adminDraft/api';
import { EmptyState } from '../../src/components/EmptyState';

export default function SurveysListPage() {
  const router = useRouter();
  const surveysQuery = useQuery({
    queryKey: ['surveys', 'list'],
    queryFn: listSurveys,
  });

  const [slug, setSlug] = useState('draft-' + new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('New draft');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      return await createSurvey({ slug, title, is_anonymous: isAnonymous });
    },
    onSuccess: (res) => {
      router.push(`/surveys/${res.survey_id}/edit`);
    },
  });

  const sortedSurveys = useMemo(() => {
    const list = surveysQuery.data?.surveys ?? [];
    return list.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [surveysQuery.data]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Surveys</h1>
          <p className="mt-1 text-sm text-zinc-600">Owner-only draft authoring</p>
        </div>
        <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href="/">
          Home
        </Link>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Create draft</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block text-xs md:col-span-1">
            <div className="mb-1 text-zinc-700">Slug</div>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>

          <label className="block text-xs md:col-span-2">
            <div className="mb-1 text-zinc-700">Title</div>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-1">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            Anonymous responses
          </label>
        </div>

        {createMutation.error ? (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create'}
          </div>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your surveys</h2>
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm"
            onClick={() => surveysQuery.refetch()}
          >
            Refresh
          </button>
        </div>

        {surveysQuery.isLoading ? (
          <div className="mt-3">
            <EmptyState title="Loading surveys…" />
          </div>
        ) : surveysQuery.error ? (
          <div className="mt-3">
            <EmptyState
              title="Failed to load surveys"
              description={surveysQuery.error instanceof Error ? surveysQuery.error.message : 'Failed to load'}
              action={
                <button
                  type="button"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
                  onClick={() => surveysQuery.refetch()}
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : sortedSurveys.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No surveys yet" description="Create a draft to get started." />
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {sortedSurveys.map((s) => (
              <div key={s.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-zinc-500">{s.status}</div>
                    <div className="text-base font-semibold">{s.title}</div>
                    <div className="mt-1 text-sm text-zinc-600">slug: {s.slug}</div>
                    <div className="mt-1 text-xs text-zinc-500">created_at: {s.created_at}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
                      href={`/surveys/${s.id}/edit`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                      href={`/surveys/${s.id}/preview`}
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
