import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../api/http'
import type { Service, TimeSlot } from '../api/types'
import { getAuthUser } from '../auth/authStore'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { formatDateTime } from '../common/datetime'

type ServiceDetailsResponse = {
  service: Service
  timeSlots: Array<TimeSlot & { remainingCapacity: number }>
}

type CreateBookingResponse = {
  booking: { id: string; timeSlotId: string; status: string }
}

export function ServiceDetailsPage() {
  const { serviceId } = useParams()
  const user = getAuthUser()
  const queryClient = useQueryClient()
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const id = serviceId ?? ''
  const canBook = user?.role === 'USER'

  const query = useQuery({
    queryKey: ['service', id],
    queryFn: () => http<ServiceDetailsResponse>(`/services/${id}`),
    enabled: Boolean(id),
  })

  const bookingMutation = useMutation({
    mutationFn: (timeSlotId: string) =>
      http<CreateBookingResponse>('/bookings', {
        method: 'POST',
        body: JSON.stringify({ timeSlotId }),
      }),
    onSuccess: () => {
      setError(null)
      setInfo('Booking created.')
      void queryClient.invalidateQueries({ queryKey: ['service', id] })
      void queryClient.invalidateQueries({ queryKey: ['meBookings'] })
    },
    onError: (err) => {
      setInfo(null)
      if (err instanceof ApiError) {
        if (err.code === 'CAPACITY_FULL' || err.code === 'DUPLICATE_BOOKING') {
          setError(`${err.code}: ${err.message}`)
        } else {
          setError(`${err.message} (requestId: ${err.requestId})`)
        }
      } else {
        setError('Booking failed')
      }
    },
  })

  const view = useMemo(() => {
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

    const data = query.data
    if (!data) return null

    return (
      <div className="space-y-3">
        <div className="rounded border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-600">
            <Link to="/services" className="text-blue-700 hover:text-blue-800">
              ← Back to services
            </Link>
          </div>
          <h1 className="mt-2 text-lg font-semibold text-gray-900">{data.service.name}</h1>
          <p className="mt-1 text-sm text-gray-700">{data.service.description}</p>

          {!canBook ? (
            <div className="mt-4">
              <Alert tone="info" message="Login as a User to create bookings." />
            </div>
          ) : null}
        </div>

        {info ? (
          <div className="rounded border border-gray-200 bg-white p-4">
            <Alert tone="info" message={info} />
          </div>
        ) : null}
        {error ? (
          <div className="rounded border border-gray-200 bg-white p-4">
            <Alert tone="error" message={error} />
          </div>
        ) : null}

        <div className="rounded border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Time slots</h2>
          <div className="mt-3 space-y-3">
            {data.timeSlots.length === 0 ? (
              <div className="text-sm text-gray-700">No available time slots.</div>
            ) : (
              data.timeSlots.map((slot) => (
                <div key={slot.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateTime(slot.startTime)} – {formatDateTime(slot.endTime)}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        Remaining: {slot.remainingCapacity}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Cancel deadline: {formatDateTime(slot.cancelDeadlineAt)}
                      </div>
                    </div>
                    {canBook ? (
                      <Button
                        type="button"
                        disabled={bookingMutation.isPending || slot.remainingCapacity <= 0}
                        onClick={() => bookingMutation.mutate(slot.id)}
                      >
                        Book
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }, [canBook, error, info, query.data, query.error, query.isLoading, bookingMutation])

  return view
}
