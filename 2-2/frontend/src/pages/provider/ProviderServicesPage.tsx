import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { Service } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'

type ListServicesResponse = { items: Service[] }

type CreateServiceResponse = { service: Service }

type CreateServiceInput = {
  name: string
  description: string
  durationMinutes: number
}

export function ProviderServicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [formError, setFormError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['provider', 'services'],
    queryFn: () => http<ListServicesResponse>('/provider/services'),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateServiceInput) =>
      http<CreateServiceResponse>('/provider/services', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['provider', 'services'] })
      setName('')
      setDescription('')
      setDurationMinutes('60')
      navigate(`/provider/services/${res.service.id}/edit`)
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Create failed'
      setFormError(msg)
    },
  })

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const duration = Number(durationMinutes)
    if (!name.trim() || !Number.isFinite(duration) || duration < 1) {
      setFormError('Please provide a valid name and duration (minutes).')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      durationMinutes: duration,
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">My Services</h1>
        <p className="mt-1 text-sm text-gray-600">Create and manage your services.</p>
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Create service</h2>

        {formError ? (
          <div className="mt-3">
            <Alert tone="error" message={formError} />
          </div>
        ) : null}

        <form className="mt-3 space-y-3" onSubmit={onCreate}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-800">Description</div>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={3}
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

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </form>
      </div>

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
            <div className="text-sm text-gray-700">No services yet.</div>
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
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/provider/services/${s.id}/edit`}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/provider/services/${s.id}/time-slots`}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800"
                      >
                        Time slots
                      </Link>
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
