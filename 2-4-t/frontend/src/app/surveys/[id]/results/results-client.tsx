'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageError, PageLoading } from '@/components/page-states';
import { useSession } from '@/features/auth/api';
import { ApiError } from '@/lib/api/client';
import { useSurvey } from '@/features/surveys/api';
import { useResults } from '@/features/results/api';
import { Aggregates } from '@/features/results/Aggregates';
import { downloadExport } from '@/features/results/export';

export function ResultsClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const user = session?.user ?? null;

  const surveyQuery = useSurvey(id);
  const resultsQuery = useResults(id);

  const status = surveyQuery.data?.survey?.status;
  const publishHash = resultsQuery.data?.publish_hash ?? surveyQuery.data?.survey?.publish_hash ?? null;
  const slug = surveyQuery.data?.survey?.slug ?? 'survey';

  const authRequired = useMemo(() => user == null, [user]);

  if (sessionLoading) return <PageLoading title="Loading…" />;
  if (authRequired) {
    return (
      <div className="space-y-3">
        <PageError title="Login required" />
        <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/results`)}`}>
          Go to login
        </a>
      </div>
    );
  }

  if (surveyQuery.isLoading || resultsQuery.isLoading) return <PageLoading title="Loading results…" />;
  if (surveyQuery.error || resultsQuery.error) {
    const err = (surveyQuery.error ?? resultsQuery.error) as unknown;
    const statusCode = err instanceof ApiError ? err.status : null;
    if (statusCode === 401) {
      return (
        <div className="space-y-3">
          <PageError title="Login required" />
          <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/results`)}`}>
            Go to login
          </a>
        </div>
      );
    }
    return <PageError title="Failed to load results" detail={(err as Error).message} />;
  }

  if (!surveyQuery.data?.survey) return <PageError title="Survey not found" />;
  if (!resultsQuery.data) return <PageError title="No results" />;
  if (status === 'DRAFT') return <PageError title="Not published" detail="Publish the survey to view results." />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <div className="text-sm text-gray-600">{surveyQuery.data.survey.title} • {surveyQuery.data.survey.status}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded border px-3 py-1" onClick={() => router.push(`/surveys/${id}/edit`)}>
            Back to edit
          </button>
          <button
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={!publishHash}
            onClick={async () => {
              if (!publishHash) return;
              await downloadExport(id, slug, publishHash, 'json');
            }}
          >
            Download JSON
          </button>
          <button
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={!publishHash}
            onClick={async () => {
              if (!publishHash) return;
              await downloadExport(id, slug, publishHash, 'csv');
            }}
          >
            Download CSV
          </button>
        </div>
      </div>

      <Aggregates results={resultsQuery.data} />
    </div>
  );
}
