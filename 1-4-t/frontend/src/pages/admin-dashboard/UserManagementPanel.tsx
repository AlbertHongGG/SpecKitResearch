import { useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/form/Button'
import { Input } from '../../components/form/Input'
import { FormError } from '../../components/form/FormError'
import { useCreateAdminUser, type CreateAdminUserRequest } from '../../api/admin'
import { isApiError } from '../../api/errors'
import { UserManagementList } from './UserManagementList'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Agent', 'Admin']),
})

type CreateValues = z.infer<typeof createSchema>

export function UserManagementPanel() {
  const [roleFilter, setRoleFilter] = useState<'Agent' | 'Admin' | 'ALL'>('ALL')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL')

  const queryParams = useMemo(() => {
    const role = roleFilter === 'ALL' ? undefined : roleFilter
    const is_active = activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE'
    return { role, is_active }
  }, [roleFilter, activeFilter])

  const create = useCreateAdminUser()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'Agent' },
  })

  const createError = isApiError(create.error) ? create.error : null

  const onCreate = async (values: CreateValues) => {
    await create.mutateAsync(values as CreateAdminUserRequest)
    reset({ email: '', password: '', role: 'Agent' })
  }

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-700">使用者管理</div>
          <div className="mt-1 text-xs text-slate-500">建立/停用 Agent 與 Admin（Customer 不在此管理）。</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-slate-700">
            <span className="mr-2">角色</span>
            <select
              className="rounded border bg-white px-2 py-1"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
            >
              <option value="ALL">全部</option>
              <option value="Agent">Agent</option>
              <option value="Admin">Admin</option>
            </select>
          </label>

          <label className="text-slate-700">
            <span className="mr-2">狀態</span>
            <select
              className="rounded border bg-white px-2 py-1"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
            >
              <option value="ALL">全部</option>
              <option value="ACTIVE">啟用</option>
              <option value="DISABLED">停用</option>
            </select>
          </label>
        </div>
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={handleSubmit(onCreate)}>
        <Input label="Email" {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
        <label className="block">
          <div className="text-sm font-medium text-slate-700">Role</div>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm" {...register('role')}>
            <option value="Agent">Agent</option>
            <option value="Admin">Admin</option>
          </select>
          {errors.role?.message ? <div className="mt-1 text-xs text-red-600">{errors.role.message}</div> : null}
        </label>

        <div className="sm:col-span-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            {createError ? (
              <FormError message={`${createError.message}${createError.requestId ? ` (request_id: ${createError.requestId})` : ''}`} />
            ) : null}
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '建立中…' : '建立使用者'}
          </Button>
        </div>
      </form>

      <UserManagementList queryParams={queryParams} />
    </div>
  )
}
