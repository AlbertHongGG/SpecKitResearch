import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { Service, ServiceStatus } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

type ListServicesResponse = { items: Service[] }
type PatchServiceResponse = { service: Service }

export function AdminServicesPage() {
  const qc = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => http<ListServicesResponse>('/admin/services'),
  })

  const patchMutation = useMutation({
    mutationFn: (input: { serviceId: string; status: ServiceStatus }) =>
      http<PatchServiceResponse>(`/admin/services/${input.serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'services'] })
      setActionError(null)
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Update failed'
      setActionError(msg)
    },
  })

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])

  const onToggle = (service: Service) => {
    setActionError(null)
    patchMutation.mutate({
      serviceId: service.id,
      status: service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Services</h1>
        <p className="mt-1 text-sm text-gray-600">Activate or deactivate services.</p>
      </div>

      {actionError ? (
        <div className="rounded border border-gray-200 bg-white p-6">
          <Alert tone="error" message={actionError} />
        </div>
      ) : null}

      <div className="rounded border border-gray-200 bg-white p-6">
        {listQuery.isLoading ? <Spinner /> : null}

        {listQuery.error ? (
          <Alert
            tone="error"
            message={
              listQuery.error instanceof ApiError
                ? `${listQuery.error.message} (requestId: ${listQuery.error.requestId})`
                : 'Load failed'
            }
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.error ? (
          items.length === 0 ? (
            <div className="text-sm text-gray-700">No services.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((s) => (
                <li key={s.id} className="rounded border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                      <div className="mt-1 text-sm text-gray-700">{s.description}</div>
                      <div className="mt-2 text-xs text-gray-600">
                        Status: {s.status} · Duration: {s.durationMinutes} min
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Provider: {s.providerId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onToggle(s)}
                        disabled={patchMutation.isPending}
                      >
                        {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  )
}
