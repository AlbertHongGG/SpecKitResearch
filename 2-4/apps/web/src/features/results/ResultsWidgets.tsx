'use client';

import type { ResultsResponseSchema } from '@acme/contracts';
import type { z } from 'zod';

type Results = z.infer<typeof ResultsResponseSchema>;

type Props = { results: Results };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ResultsWidgets({ results }: Props) {
  return (
    <div className="space-y-4">
      {results.aggregates.map((a) => (
        <section key={a.question_id} className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold">{a.type}</div>
          <div className="mt-1 text-xs text-zinc-500">question_id: {a.question_id}</div>

          <div className="mt-3 text-sm text-zinc-800">
            {a.type === 'SingleChoice' || a.type === 'MultipleChoice' ? (
              (() => {
                if (!isRecord(a.data) || !isRecord(a.data.counts)) return <div>No counts.</div>;
                const entries = Object.entries(a.data.counts).filter(([, v]) => typeof v === 'number') as Array<
                  [string, number]
                >;
                entries.sort((x, y) => y[1] - x[1]);
                return entries.length === 0 ? (
                  <div>No responses.</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {entries.map(([k, v]) => (
                      <li key={k}>
                        {k}: {v}
                      </li>
                    ))}
                  </ul>
                );
              })()
            ) : a.type === 'Text' ? (
              (() => {
                const nonBlank = isRecord(a.data) && typeof a.data.non_blank === 'number' ? a.data.non_blank : 0;
                return <div>Non-blank: {nonBlank}</div>;
              })()
            ) : a.type === 'Number' || a.type === 'Rating' ? (
              (() => {
                if (!isRecord(a.data)) return <div>No stats.</div>;
                const count = typeof a.data.count === 'number' ? a.data.count : 0;
                const min = typeof a.data.min === 'number' ? a.data.min : null;
                const max = typeof a.data.max === 'number' ? a.data.max : null;
                const avg = typeof a.data.avg === 'number' ? a.data.avg : null;
                return (
                  <div className="grid gap-1 text-sm">
                    <div>Count: {count}</div>
                    <div>Min: {min ?? '—'}</div>
                    <div>Max: {max ?? '—'}</div>
                    <div>Avg: {avg !== null ? avg.toFixed(2) : '—'}</div>
                  </div>
                );
              })()
            ) : a.type === 'Matrix' ? (
              (() => {
                if (!isRecord(a.data) || !isRecord(a.data.row_counts)) return <div>No row counts.</div>;
                const entries = Object.entries(a.data.row_counts).filter(([, v]) => typeof v === 'number') as Array<
                  [string, number]
                >;
                entries.sort((x, y) => y[1] - x[1]);
                return entries.length === 0 ? (
                  <div>No responses.</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {entries.map(([k, v]) => (
                      <li key={k}>
                        {k}: {v}
                      </li>
                    ))}
                  </ul>
                );
              })()
            ) : (
              <div>Unsupported aggregate widget.</div>
            )}
          </div>

          <div className="mt-2 overflow-auto rounded-md bg-zinc-50 p-3 text-xs">
            <pre>{JSON.stringify(a.data, null, 2)}</pre>
          </div>
        </section>
      ))}
    </div>
  );
}
