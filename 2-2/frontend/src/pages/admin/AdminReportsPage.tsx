import { useQuery } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import { Alert } from '../../components/Alert'
import { Spinner } from '../../components/Spinner'

export type AdminSummaryReport = {
  totalBookings: number
  cancellationRate: number
  activeServicesCount: number
  activeProvidersCount: number
}

export function AdminReportsPage() {
  const reportQuery = useQuery({
    queryKey: ['admin', 'reports', 'summary'],
    queryFn: () => http<AdminSummaryReport>('/admin/reports/summary'),
  })

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Summary Report</h1>
        <p className="mt-1 text-sm text-gray-600">Platform-level metrics.</p>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        {reportQuery.isLoading ? <Spinner /> : null}

        {reportQuery.error ? (
          <Alert
            tone="error"
            message={
              reportQuery.error instanceof ApiError
                ? `${reportQuery.error.message} (requestId: ${reportQuery.error.requestId})`
                : 'Load failed'
            }
          />
        ) : null}

        {reportQuery.data ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded border border-gray-200 p-4">
              <dt className="text-xs font-medium text-gray-600">Total bookings</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {reportQuery.data.totalBookings}
              </dd>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <dt className="text-xs font-medium text-gray-600">Cancellation rate</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {Math.round(reportQuery.data.cancellationRate * 100)}%
              </dd>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <dt className="text-xs font-medium text-gray-600">Active services</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {reportQuery.data.activeServicesCount}
              </dd>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <dt className="text-xs font-medium text-gray-600">Active providers</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {reportQuery.data.activeProvidersCount}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  )
}
