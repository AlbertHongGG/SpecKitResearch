'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getResults } from '../../../../src/features/adminDraft/api';
import { ResultsWidgets } from '../../../../src/features/results/ResultsWidgets';
import { downloadJson, exportAllPages } from '../../../../src/features/results/exportClient';
import { EmptyState } from '../../../../src/components/EmptyState';

export default function SurveyResultsPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = params.surveyId;

  const resultsQuery = useQuery({
    queryKey: ['surveys', surveyId, 'results'],
    queryFn: () => getResults(surveyId),
  });

  const [exporting, setExporting] = useState(false);
  const canExport = useMemo(() => {
    return Boolean(resultsQuery.data?.publish_hash);
  }, [resultsQuery.data]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="mt-1 text-sm text-zinc-600">Survey ID: {surveyId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href={`/surveys/${surveyId}/edit`}>
            Back
          </Link>
        </div>
      </div>

      {resultsQuery.isLoading ? (
        <div className="mt-6">
          <EmptyState title="Loading results…" />
        </div>
      ) : null}

      {resultsQuery.error ? (
        <div className="mt-6">
          <EmptyState
            title="Failed to load results"
            description={resultsQuery.error instanceof Error ? resultsQuery.error.message : 'Failed to load results'}
            action={
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
                onClick={() => resultsQuery.refetch()}
              >
                Retry
              </button>
            }
          />
        </div>
      ) : null}

      {resultsQuery.data ? (
        <>
          <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold">Summary</div>
            <div className="mt-2 text-sm text-zinc-700">Responses: {resultsQuery.data.totals.response_count}</div>
            <div className="mt-1 text-xs text-zinc-500">Publish hash: {resultsQuery.data.publish_hash}</div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={!canExport || exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    const all = await exportAllPages({ surveyId, limit: 200, maxPages: 20 });
                    downloadJson(`export-${surveyId}.json`, all);
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? 'Exporting…' : 'Download export (JSON)'}
              </button>
              <Link
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm"
                href={`/s/${resultsQuery.data.survey.slug}`}
              >
                Open public
              </Link>
            </div>
          </section>

          <div className="mt-6">
            <ResultsWidgets results={resultsQuery.data} />
          </div>
        </>
      ) : resultsQuery.isLoading || resultsQuery.error ? null : (
        <div className="mt-6">
          <EmptyState title="No results" description="Publish and collect responses first." />
        </div>
      )}
    </main>
  );
}
