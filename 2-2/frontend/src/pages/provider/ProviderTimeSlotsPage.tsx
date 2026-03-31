import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { Service, TimeSlot, TimeSlotStatus } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { formatDateTime } from '../../common/datetime'

type GetServiceResponse = { service: Service }

type ListTimeSlotsResponse = { items: TimeSlot[] }

type CreateTimeSlotResponse = { timeSlot: TimeSlot }

type PatchTimeSlotResponse = { timeSlot: TimeSlot }

type CreateTimeSlotInput = {
  startTime: string
  endTime: string
  capacity: number
  cancelDeadlineAt: string
}

type PatchTimeSlotInput = {
  startTime?: string
  endTime?: string
  capacity?: number
  cancelDeadlineAt?: string
  status?: TimeSlotStatus
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ProviderTimeSlotsPage() {
  const { serviceId } = useParams()
  const qc = useQueryClient()

  const [createStart, setCreateStart] = useState('')
  const [createEnd, setCreateEnd] = useState('')
  const [createCapacity, setCreateCapacity] = useState('1')
  const [createCancelDeadlineAt, setCreateCancelDeadlineAt] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const serviceQuery = useQuery({
    queryKey: ['provider', 'services', serviceId],
    enabled: !!serviceId,
    queryFn: () => http<GetServiceResponse>(`/provider/services/${serviceId}`),
  })

  const listQuery = useQuery({
    queryKey: ['provider', 'services', serviceId, 'timeSlots'],
    enabled: !!serviceId,
    queryFn: () => http<ListTimeSlotsResponse>(`/provider/services/${serviceId}/time-slots`),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateTimeSlotInput) =>
      http<CreateTimeSlotResponse>(`/provider/services/${serviceId}/time-slots`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider', 'services', serviceId, 'timeSlots'] })
      setCreateStart('')
      setCreateEnd('')
      setCreateCapacity('1')
      setCreateCancelDeadlineAt('')
      setCreateError(null)
    },
    onError: (err) => {
      setCreateError(
        err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Create failed',
      )
    },
  })

  const patchMutation = useMutation({
    mutationFn: (input: { timeSlotId: string; patch: PatchTimeSlotInput }) =>
      http<PatchTimeSlotResponse>(`/provider/time-slots/${input.timeSlotId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.patch),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider', 'services', serviceId, 'timeSlots'] })
    },
  })

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    const cap = Number(createCapacity)
    if (!createStart || !createEnd || !createCancelDeadlineAt || !Number.isFinite(cap) || cap < 1) {
      setCreateError('Please provide valid start/end, cancel deadline, and capacity.')
      return
    }

    const startIso = new Date(createStart).toISOString()
    const endIso = new Date(createEnd).toISOString()
    const cancelIso = new Date(createCancelDeadlineAt).toISOString()

    createMutation.mutate({
      startTime: startIso,
      endTime: endIso,
      cancelDeadlineAt: cancelIso,
      capacity: cap,
    })
  }

  if (!serviceId) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message="Missing serviceId" />
      </div>
    )
  }

  if (serviceQuery.isLoading || listQuery.isLoading) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Spinner />
      </div>
    )
  }

  if (serviceQuery.error) {
    const err = serviceQuery.error as unknown
    const msg =
      err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Load failed'
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message={msg} />
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

  const service = serviceQuery.data?.service

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Time Slots</h1>
            <p className="mt-1 text-sm text-gray-600">
              Service: {service?.name ?? serviceId} ({service?.status ?? '—'})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/provider/services/${serviceId}/edit`}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Create time slot</h2>

        {createError ? (
          <div className="mt-3">
            <Alert tone="error" message={createError} />
          </div>
        ) : null}

        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <Input
            label="Start time"
            type="datetime-local"
            value={createStart}
            onChange={(e) => setCreateStart(e.target.value)}
            required
          />
          <Input
            label="End time"
            type="datetime-local"
            value={createEnd}
            onChange={(e) => setCreateEnd(e.target.value)}
            required
          />
          <Input
            label="Cancel deadline"
            type="datetime-local"
            value={createCancelDeadlineAt}
            onChange={(e) => setCreateCancelDeadlineAt(e.target.value)}
            required
          />
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={createCapacity}
            onChange={(e) => setCreateCapacity(e.target.value)}
            required
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        {items.length === 0 ? (
          <div className="text-sm text-gray-700">No time slots yet.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((slot) => (
              <li key={slot.id} className="rounded border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatDateTime(slot.startTime)} → {formatDateTime(slot.endTime)}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      Status: {slot.status} · Capacity: {slot.capacity} · Booked: {slot.bookedCount}{' '}
                      · Remaining: {slot.remainingCapacity}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Cancel deadline: {formatDateTime(slot.cancelDeadlineAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/provider/time-slots/${slot.id}/bookings`}
                      className="text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      Bookings
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={patchMutation.isPending}
                      onClick={() =>
                        patchMutation.mutate({
                          timeSlotId: slot.id,
                          patch: { status: slot.status === 'OPEN' ? 'CLOSED' : 'OPEN' },
                        })
                      }
                    >
                      {slot.status === 'OPEN' ? 'Close' : 'Open'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded border border-gray-100 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">Update</div>
                  <UpdateTimeSlotForm
                    slot={slot}
                    disabled={patchMutation.isPending}
                    onSubmit={(patch) => patchMutation.mutate({ timeSlotId: slot.id, patch })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function UpdateTimeSlotForm(props: {
  slot: TimeSlot
  disabled: boolean
  onSubmit: (patch: PatchTimeSlotInput) => void
}) {
  const { slot, disabled, onSubmit } = props

  const [startTime, setStartTime] = useState(() => toLocalInputValue(slot.startTime))
  const [endTime, setEndTime] = useState(() => toLocalInputValue(slot.endTime))
  const [cancelDeadlineAt, setCancelDeadlineAt] = useState(() =>
    toLocalInputValue(slot.cancelDeadlineAt),
  )
  const [capacity, setCapacity] = useState(() => String(slot.capacity))
  const [status, setStatus] = useState<TimeSlotStatus>(slot.status)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cap = Number(capacity)
    if (!startTime || !endTime || !cancelDeadlineAt || !Number.isFinite(cap) || cap < 1) {
      setError('Please provide valid values.')
      return
    }

    onSubmit({
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      cancelDeadlineAt: new Date(cancelDeadlineAt).toISOString(),
      capacity: cap,
      status,
    })
  }

  return (
    <form className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submit}>
      {error ? (
        <div className="md:col-span-2">
          <Alert tone="error" message={error} />
        </div>
      ) : null}
      <Input
        label="Start time"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />
      <Input
        label="End time"
        type="datetime-local"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        required
      />
      <Input
        label="Cancel deadline"
        type="datetime-local"
        value={cancelDeadlineAt}
        onChange={(e) => setCancelDeadlineAt(e.target.value)}
        required
      />
      <Input
        label="Capacity"
        type="number"
        min={1}
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        required
      />
      <label className="block">
        <div className="mb-1 text-sm font-medium text-gray-800">Status</div>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as TimeSlotStatus)}
          disabled={disabled}
        >
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </label>
      <div className="md:col-span-2">
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
