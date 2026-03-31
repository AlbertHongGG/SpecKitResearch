import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, http } from '../../api/http'
import type { User, UserStatus } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

type ListUsersResponse = { items: User[] }
type PatchUserResponse = { user: User }

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => http<ListUsersResponse>('/admin/users'),
  })

  const patchMutation = useMutation({
    mutationFn: (input: { userId: string; status: UserStatus }) =>
      http<PatchUserResponse>(`/admin/users/${input.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setActionError(null)
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? `${err.message} (requestId: ${err.requestId})` : 'Update failed'
      setActionError(msg)
    },
  })

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])

  const onToggle = (user: User) => {
    setActionError(null)
    patchMutation.mutate({
      userId: user.id,
      status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-600">Suspend or reactivate accounts.</p>
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
            <div className="text-sm text-gray-700">No users.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((u) => (
                <li key={u.id} className="rounded border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{u.email}</div>
                      <div className="mt-2 text-xs text-gray-600">
                        Role: {u.role} · Status: {u.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onToggle(u)}
                        disabled={patchMutation.isPending}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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
