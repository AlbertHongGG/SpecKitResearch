import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { Service, ServiceStatus } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'

type GetServiceResponse = { service: Service }

type PatchServiceResponse = { service: Service }

type PatchServiceInput = {
  name?: string
  description?: string
  durationMinutes?: number
  status?: ServiceStatus
}

export function ProviderServiceEditPage() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [saveError, setSaveError] = useState<string | null>(null)

  const serviceQuery = useQuery({
    queryKey: ['provider', 'services', serviceId],
    enabled: !!serviceId,
    queryFn: () => http<GetServiceResponse>(`/provider/services/${serviceId}`),
  })

  const service = serviceQuery.data?.service

  const patchMutation = useMutation({
    mutationFn: (patch: PatchServiceInput) =>
      http<PatchServiceResponse>(`/provider/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['provider', 'services'] }),
        qc.invalidateQueries({ queryKey: ['provider', 'services', serviceId] }),
      ])
      setSaveError(null)
    },
    onError: (err) => {
      setSaveError(
        err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Save failed',
      )
    },
  })

  const onSave = (patch: PatchServiceInput) => {
    setSaveError(null)
    patchMutation.mutate(patch)
  }

  const header = useMemo(() => {
    if (!serviceId) return 'Service'
    return `Service: ${serviceId}`
  }, [serviceId])

  if (!serviceId) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6">
        <Alert tone="error" message="Missing serviceId" />
      </div>
    )
  }

  if (serviceQuery.isLoading) {
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

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Edit Service</h1>
            <div className="mt-1 text-xs text-gray-600">{header}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/provider/services"
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Back
            </Link>
            <Link
              to={`/provider/services/${serviceId}/time-slots`}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Manage time slots
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        {saveError ? <Alert tone="error" message={saveError} /> : null}

        {service ? (
          <ProviderServiceEditForm
            key={service.id}
            service={service}
            disabled={patchMutation.isPending}
            onSave={onSave}
            onGoTimeSlots={() => navigate(`/provider/services/${serviceId}/time-slots`)}
          />
        ) : null}
      </div>
    </div>
  )
}

function ProviderServiceEditForm(props: {
  service: Service
  disabled: boolean
  onSave: (patch: PatchServiceInput) => void
  onGoTimeSlots: () => void
}) {
  const { service, disabled, onSave, onGoTimeSlots } = props

  const [name, setName] = useState(service.name)
  const [description, setDescription] = useState(service.description)
  const [durationMinutes, setDurationMinutes] = useState(String(service.durationMinutes))
  const [status, setStatus] = useState<ServiceStatus>(service.status)
  const [formError, setFormError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const duration = Number(durationMinutes)
    if (!name.trim() || !Number.isFinite(duration) || duration < 1) {
      setFormError('Please provide a valid name and duration (minutes).')
      return
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      durationMinutes: duration,
      status,
    })
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={submit}>
      {formError ? <Alert tone="error" message={formError} /> : null}

      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

      <label className="block">
        <div className="mb-1 text-sm font-medium text-gray-800">Description</div>
        <textarea
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <Input
        label="Duration (minutes)"
        type="number"
        min={1}
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(e.target.value)}
        required
      />

      <label className="block">
        <div className="mb-1 text-sm font-medium text-gray-800">Status</div>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as ServiceStatus)}
          disabled={disabled}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={onGoTimeSlots}>
          Time slots
        </Button>
      </div>
    </form>
  )
}
