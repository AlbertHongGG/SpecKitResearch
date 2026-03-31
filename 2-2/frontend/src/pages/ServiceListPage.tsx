import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { http, ApiError } from '../api/http'
import type { Service } from '../api/types'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'

type ServicesResponse = { items: Service[] }

export function ServiceListPage() {
  const query = useQuery({
    queryKey: ['services'],
    queryFn: () => http<ServicesResponse>('/services'),
  })

  if (query.isLoading) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Spinner />
      </div>
    )
  }

  if (query.error) {
    const err = query.error as unknown
    const msg =
      err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Load failed'
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message={msg} />
      </div>
    )
  }

  const items = query.data?.items ?? []

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Services</h1>
        <p className="mt-1 text-sm text-gray-600">Browse available services and time slots.</p>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        {items.length === 0 ? (
          <div className="text-sm text-gray-700">No services available.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id} className="rounded border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                    <div className="mt-1 text-sm text-gray-700">{s.description}</div>
                  </div>
                  <Link
                    to={`/services/${s.id}`}
                    className="text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
