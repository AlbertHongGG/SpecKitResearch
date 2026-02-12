import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { useAdminActivity, useCreateActivity, useUpdateActivity } from '../../features/admin/api'
import { activityFormSchema, type ActivityFormValues } from './activityFormSchema'
import { toastError, toastSuccess } from '../../lib/notifications'

export function AdminActivityFormPage() {
  const navigate = useNavigate()
  const { activityId } = useParams()
  const isEdit = !!activityId

  const create = useCreateActivity()
  const update = useUpdateActivity()
  const detail = useAdminActivity(activityId ?? '')

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      deadline: '',
      location: '',
      capacity: 1,
      status: 'draft',
    },
  })

  useEffect(() => {
    if (!isEdit) return
    if (!detail.data?.activity) return

    const a = detail.data.activity
    form.reset({
      title: a.title,
      description: a.description,
      date: a.date,
      deadline: a.deadline,
      location: a.location,
      capacity: a.capacity,
      status: a.status,
    })
  }, [detail.data?.activity, form, isEdit])

  async function onSubmit(values: ActivityFormValues) {
    try {
      if (isEdit && activityId) {
        await update.mutateAsync({
          activityId,
          body: {
            title: values.title,
            description: values.description,
            date: values.date,
            deadline: values.deadline,
            location: values.location,
            capacity: values.capacity,
            status: values.status,
          },
        })
        toastSuccess('活動已更新')
      } else {
        await create.mutateAsync({
          title: values.title,
          description: values.description,
          date: values.date,
          deadline: values.deadline,
          location: values.location,
          capacity: values.capacity,
          status: values.status,
        })
        toastSuccess('活動已建立')
      }

      navigate('/admin', { replace: true })
    } catch (err) {
      toastError('操作失敗', (err as any)?.message ?? '請稍後再試')
      throw err
    }
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{isEdit ? '編輯活動' : '建立活動'}</h1>

      {(create.isError || update.isError || detail.isError) && (
        <div className="mt-4">
          <Alert title="操作失敗" description={(create.error as any)?.message ?? (update.error as any)?.message ?? '請稍後再試'} />
        </div>
      )}

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="text-sm font-medium" htmlFor="title">
            標題
          </label>
          <div className="mt-1">
            <Input id="title" {...form.register('title')} />
          </div>
          {form.formState.errors.title ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.title.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="location">
            地點
          </label>
          <div className="mt-1">
            <Input id="location" {...form.register('location')} />
          </div>
          {form.formState.errors.location ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.location.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="date">
            活動開始時間（ISO）
          </label>
          <div className="mt-1">
            <Input id="date" placeholder="2026-02-10T10:00:00.000Z" {...form.register('date')} />
          </div>
          {form.formState.errors.date ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.date.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="deadline">
            報名截止（ISO）
          </label>
          <div className="mt-1">
            <Input id="deadline" placeholder="2026-02-09T10:00:00.000Z" {...form.register('deadline')} />
          </div>
          {form.formState.errors.deadline ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.deadline.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="capacity">
            名額
          </label>
          <div className="mt-1">
            <Input id="capacity" type="number" {...form.register('capacity', { valueAsNumber: true })} />
          </div>
          {form.formState.errors.capacity ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.capacity.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="status">
            狀態
          </label>
          <div className="mt-1">
            <select
              id="status"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              {...form.register('status')}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="closed">closed</option>
              <option value="archived">archived</option>
              <option value="full">full</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="description">
            說明
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              {...form.register('description')}
            />
          </div>
        </div>

        <Button type="submit" disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending ? '送出中…' : '送出'}
        </Button>
      </form>
    </div>
  )
}
