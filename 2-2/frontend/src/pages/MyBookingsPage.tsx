import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../api/http'
import type { Booking } from '../api/types'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { formatDateTime } from '../common/datetime'

type MyBookingsResponse = { items: Booking[] }
type CancelResponse = { booking: Booking }

export function MyBookingsPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['meBookings'],
    queryFn: () => http<MyBookingsResponse>('/me/bookings'),
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      http<CancelResponse>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      }),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['meBookings'] })
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(`${err.code}: ${err.message}`)
      } else {
        setError('Cancel failed')
      }
    },
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
        <h1 className="text-lg font-semibold text-gray-900">My bookings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage and cancel bookings before the deadline.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-gray-200 bg-white p-4">
          <Alert tone="error" message={error} />
        </div>
      ) : null}

      <div className="rounded border border-gray-200 bg-white p-6">
        {items.length === 0 ? (
          <div className="text-sm text-gray-700">No bookings yet.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((b) => {
              const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED'
              return (
                <li key={b.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Booking</div>
                      <div className="mt-1 text-sm text-gray-700">Status: {b.status}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        Created: {formatDateTime(b.createdAt)}
                      </div>
                    </div>
                    {canCancel ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(b.id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
