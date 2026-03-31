import { useQuery } from '@tanstack/react-query';

import { ApiError, apiGetJson } from '../../api/http';
import { ReportSummarySchema } from '../../api/schemas';

export function AdminReportsPanel() {
  const summaryQuery = useQuery({
    queryKey: ['admin-report-summary'],
    queryFn: () => apiGetJson('/admin/reports/summary', ReportSummarySchema),
  });

  if (summaryQuery.isLoading) return <div className="text-sm">Loading...</div>;

  if (summaryQuery.isError) {
    const error = summaryQuery.error as unknown;
    const msg = error instanceof ApiError ? error.message : 'Error loading report.';
    return (
      <div>
        <p className="text-sm text-red-700">{msg}</p>
        <button
          type="button"
          className="mt-3 rounded border px-3 py-2 text-sm"
          onClick={() => summaryQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const s = summaryQuery.data;
  if (!s) return <div className="text-sm">No report data.</div>;

  const ratePct = Math.round(s.cancellationRate * 10_000) / 100;

  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-gray-600">Total bookings:</span> {s.totals.bookings}
      </div>
      <div>
        <span className="text-gray-600">Cancelled:</span> {s.totals.cancelled}
      </div>
      <div>
        <span className="text-gray-600">Cancellation rate:</span> {ratePct}%
      </div>
      <div>
        <span className="text-gray-600">Active services:</span> {s.activeServices}
      </div>
      <div className="text-xs text-gray-500">Generated at: {new Date(s.generatedAt).toLocaleString()}</div>
    </div>
  );
}
