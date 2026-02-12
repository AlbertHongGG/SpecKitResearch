'use client';

import type { ResultsResponse } from './api';

export function Aggregates({ results }: { results: ResultsResponse }) {
  return (
    <div className="space-y-3">
      <div className="rounded border bg-white p-3">
        <div className="font-medium">Summary</div>
        <div className="text-sm text-gray-600">Responses: {results.response_count}</div>
        <div className="text-sm text-gray-600">Publish hash: <span className="font-mono">{results.publish_hash}</span></div>
      </div>

      <div className="space-y-2">
        {results.aggregates.map((a) => (
          <div key={a.question_id} className="rounded border bg-white p-3">
            <div className="font-medium">{a.question_id}</div>
            <div className="text-sm text-gray-600">Type: {a.type}</div>
            <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify(a.summary, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
