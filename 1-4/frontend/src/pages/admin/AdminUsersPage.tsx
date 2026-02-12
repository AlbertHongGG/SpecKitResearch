import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ApiUserRole, ApiUser } from '../../api/auth'
import { ErrorState } from '../../components/states/ErrorState'
import {
  useAdminCreateUserMutation,
  useAdminUpdateUserMutation,
} from '../../features/admin/api/admin.queries'

const Schema = z
  .object({
    email: z.string().email(),
    role: z.enum(['Customer', 'Agent', 'Admin']),
    is_active: z.boolean().optional(),
  })
  .strict()

type FormValues = z.infer<typeof Schema>

function RoleSelect(props: {
  value: ApiUserRole
  disabled?: boolean
  onChange: (role: ApiUserRole) => void
}) {
  return (
    <select
      className="rounded border bg-white px-2 py-1 text-sm"
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value as ApiUserRole)}
    >
      <option value="Customer">Customer</option>
      <option value="Agent">Agent</option>
      <option value="Admin">Admin</option>
    </select>
  )
}

export function AdminUsersPage() {
  const createUser = useAdminCreateUserMutation()
  const updateUser = useAdminUpdateUserMutation()

  const [createdUsers, setCreatedUsers] = useState<ApiUser[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      email: '',
      role: 'Agent',
      is_active: true,
    },
  })

  const onCreate = form.handleSubmit(async (values) => {
    const res = await createUser.mutateAsync({
      email: values.email,
      role: values.role,
      is_active: values.is_active,
    })

    setCreatedUsers((prev) => [res.user, ...prev])
    form.reset({ email: '', role: values.role, is_active: true })
  })

  const error = createUser.error ?? updateUser.error

  const hasAnyUsers = useMemo(() => createdUsers.length > 0, [createdUsers])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>

      {error ? (
        <div className="rounded border bg-white">
          <ErrorState error={error} title="操作失敗" />
        </div>
      ) : null}

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold">建立使用者</h2>

        <form className="mt-3 grid gap-3 sm:grid-cols-4" onSubmit={onCreate}>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              type="email"
              placeholder="new-agent@example.com"
              disabled={createUser.isPending}
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <div className="mt-1 text-xs text-red-600">
                {form.formState.errors.email.message}
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs text-gray-600" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
              disabled={createUser.isPending}
              {...form.register('role')}
            >
              <option value="Customer">Customer</option>
              <option value="Agent">Agent</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={createUser.isPending}
                {...form.register('is_active')}
              />
              Active
            </label>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={createUser.isPending}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              建立
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-gray-500">
          提醒：目前 API 沒有提供 users 列表，本頁只顯示「本次建立」的使用者。
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold">本次建立的使用者</h2>
        {!hasAnyUsers ? (
          <div className="mt-3 text-sm text-gray-600">尚無使用者</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {createdUsers.map((u) => (
              <li key={u.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {u.email}
                    </div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      id: {u.id}
                    </div>
                  </div>

                  <RoleSelect
                    value={u.role}
                    disabled={updateUser.isPending}
                    onChange={async (role) => {
                      const res = await updateUser.mutateAsync({
                        userId: u.id,
                        role,
                      })
                      setCreatedUsers((prev) =>
                        prev.map((x) => (x.id === u.id ? res.user : x)),
                      )
                    }}
                  />

                  <button
                    type="button"
                    disabled={updateUser.isPending}
                    className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
                    onClick={async () => {
                      const res = await updateUser.mutateAsync({
                        userId: u.id,
                        is_active: !u.is_active,
                      })
                      setCreatedUsers((prev) =>
                        prev.map((x) => (x.id === u.id ? res.user : x)),
                      )
                    }}
                  >
                    {u.is_active ? '停用' : '啟用'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
