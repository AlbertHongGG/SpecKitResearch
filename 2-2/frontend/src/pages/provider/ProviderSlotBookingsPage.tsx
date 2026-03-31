import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { Booking } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { formatDateTime } from '../../common/datetime'

type ListBookingsResponse = { items: Booking[] }

type BookingResponse = { booking: Booking }

export function ProviderSlotBookingsPage() {
  const { timeSlotId } = useParams()
  const qc = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['provider', 'timeSlots', timeSlotId, 'bookings'],
    enabled: !!timeSlotId,
    queryFn: () => http<ListBookingsResponse>(`/provider/time-slots/${timeSlotId}/bookings`),
  })

  const completeMutation = useMutation({
    mutationFn: (bookingId: string) =>
      http<BookingResponse>(`/provider/bookings/${bookingId}/complete`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider', 'timeSlots', timeSlotId, 'bookings'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      http<BookingResponse>(`/provider/bookings/${bookingId}/cancel`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider', 'timeSlots', timeSlotId, 'bookings'] })
    },
  })

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])

  if (!timeSlotId) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message="Missing timeSlotId" />
      </div>
    )
  }

  if (listQuery.isLoading) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Spinner />
      </div>
    )
  }

  if (listQuery.error) {
    const err = listQuery.error as unknown
    const msg =
      err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Load failed'
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message={msg} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Time Slot Bookings</h1>
            <div className="mt-1 text-xs text-gray-600">TimeSlot: {timeSlotId}</div>
          </div>
          <Link
            to="/provider/services"
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Provider home
          </Link>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        {items.length === 0 ? (
          <div className="text-sm text-gray-700">No bookings.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((b) => {
              const isActionable = b.status === 'PENDING' || b.status === 'CONFIRMED'
              const isBusy = completeMutation.isPending || cancelMutation.isPending

              return (
                <li key={b.id} className="rounded border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Booking {b.id}</div>
                      <div className="mt-1 text-sm text-gray-700">Status: {b.status}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        User: {b.userId} · Created: {formatDateTime(b.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        disabled={!isActionable || isBusy}
                        onClick={() => completeMutation.mutate(b.id)}
                      >
                        Complete
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!isActionable || isBusy}
                        onClick={() => cancelMutation.mutate(b.id)}
                      >
                        Cancel
                      </Button>
                    </div>
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
