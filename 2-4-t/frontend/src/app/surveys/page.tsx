'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageError, PageLoading } from '@/components/page-states';
import { useSession } from '@/features/auth/api';
import { ApiError } from '@/lib/api/client';
import { useCreateSurvey, useSurveysList } from '@/features/surveys/api';

export default function Page() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();

  const csrfToken = session?.csrf_token;
  const user = session?.user ?? null;

  const { data, isLoading, error, refetch } = useSurveysList();
  const create = useCreateSurvey(csrfToken);

  const [title, setTitle] = useState('My Survey');
  const [slug, setSlug] = useState('my-survey');
  const [description, setDescription] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const authRequired = useMemo(() => user == null, [user]);

  if (sessionLoading) return <PageLoading title="Loading…" />;
  if (authRequired) {
    return (
      <div className="space-y-3">
        <PageError title="Login required" detail="Please sign in to manage surveys." />
        <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent('/surveys')}`}>
          Go to login
        </a>
      </div>
    );
  }

  if (isLoading) return <PageLoading title="Loading surveys…" />;
  if (error) {
    const status = error instanceof ApiError ? error.status : null;
    if (status === 401) {
      return (
        <div className="space-y-3">
          <PageError title="Login required" detail="Please sign in again." />
          <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent('/surveys')}`}>
            Go to login
          </a>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <PageError title="Failed to load surveys" detail={(error as Error).message} />
        <button className="rounded border px-3 py-1" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const surveys = data?.surveys ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Surveys</h1>
        <div className="text-sm text-gray-600">Create and edit draft surveys.</div>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="font-medium">Create draft</div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Title</label>
            <input className="w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Slug</label>
            <input className="w-full rounded border px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description (optional)</label>
            <input className="w-full rounded border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            Anonymous (no login required to respond)
          </label>
        </div>

        <button
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          disabled={!csrfToken || create.isPending}
          onClick={async () => {
            const res = await create.mutateAsync({
              title,
              slug,
              is_anonymous: isAnonymous,
              description: description ? description : null
            });
            router.push(`/surveys/${res.survey.id}/edit`);
          }}
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </button>

        {create.error ? (
          <div className="text-sm text-red-700">{(create.error as Error).message}</div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="font-medium">Your surveys</div>
        {surveys.length === 0 ? (
          <div className="text-sm text-gray-600">No surveys yet.</div>
        ) : (
          <div className="divide-y rounded border bg-white">
            {surveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-gray-600">
                    /s/{s.slug} • {s.status} • {s.is_anonymous ? 'anonymous' : 'requires login'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-3 py-1" onClick={() => router.push(`/surveys/${s.id}/edit`)}>
                    Edit
                  </button>
                  <button className="rounded border px-3 py-1" onClick={() => router.push(`/surveys/${s.id}/preview`)}>
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
