import { useEffect, useState } from 'react'
import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { useAdminUsers, useUpdateAdminUser, type AdminUser } from '../../api/admin'
import { isApiError } from '../../api/errors'

export function UserManagementList(props: {
  queryParams: { role?: 'Agent' | 'Admin'; is_active?: boolean }
}) {
  const q = useAdminUsers(props.queryParams)
  const update = useUpdateAdminUser()

  const [items, setItems] = useState<AdminUser[]>([])
  useEffect(() => {
    if (q.data?.items) setItems(q.data.items)
  }, [q.data?.items])

  const updateError = isApiError(update.error) ? update.error : null

  const onPatch = async (userId: string, patch: { is_active?: boolean; role?: 'Agent' | 'Admin' }) => {
    const res = await update.mutateAsync({
      userId,
      body: {
        ...(patch.is_active !== undefined ? { is_active: patch.is_active } : null),
        ...(patch.role !== undefined ? { role: patch.role } : null),
      },
    })

    setItems((prev) => prev.map((u) => (u.id === userId ? res.user : u)))
  }

  return (
    <div className="mt-4">
      {updateError ? (
        <div className="mb-2">
          <FormError message={`${updateError.message}${updateError.requestId ? ` (request_id: ${updateError.requestId})` : ''}`} />
        </div>
      ) : null}

      {q.isLoading ? <div className="text-sm text-slate-600">載入中…</div> : null}
      {q.isError ? <div className="text-sm text-red-700">載入失敗</div> : null}

      {!q.isLoading && !q.isError ? (
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs text-slate-600">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((u) => {
                const isSelf = false
                return (
                  <tr key={u.id}>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-slate-900">{u.email}</div>
                      <div className="text-xs font-mono text-slate-500" title={u.id}>
                        {u.id}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        aria-label={`set role for ${u.email}`}
                        className="rounded border bg-white px-2 py-1 text-sm"
                        value={u.role}
                        disabled={update.isPending || isSelf}
                        onChange={(e) => onPatch(u.id, { role: e.target.value as any })}
                      >
                        <option value="Agent">Agent</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={u.is_active ? 'text-emerald-700' : 'text-slate-500'}>
                        {u.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {u.is_active ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={update.isPending || isSelf}
                            onClick={() => onPatch(u.id, { is_active: false })}
                          >
                            停用
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={update.isPending || isSelf}
                            onClick={() => onPatch(u.id, { is_active: true })}
                          >
                            啟用
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length === 0 ? <div className="mt-2 text-sm text-slate-600">沒有資料</div> : null}
        </div>
      ) : null}
    </div>
  )
}
