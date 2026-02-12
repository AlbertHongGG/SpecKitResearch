import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/form/Button'
import { Input } from '../../components/form/Input'
import { TextArea } from '../../components/form/TextArea'
import { FormError } from '../../components/form/FormError'
import { useCreateTicket, type TicketCategory } from '../../api/tickets'
import { isApiError } from '../../api/errors'

const schema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(['Account', 'Billing', 'Technical', 'Other']),
  description: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function CreateTicketDialog(props: { open: boolean; onClose: () => void }) {
  const dialogTitleId = useId()
  const categoryId = useId()
  const categoryErrorId = `${categoryId}-error`

  const createTicket = useCreateTicket()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Other' },
  })

  useEffect(() => {
    if (!props.open) {
      reset({ title: '', category: 'Other', description: '' })
      createTicket.reset()
    }
  }, [props.open, reset, createTicket])

  if (!props.open) return null

  const onSubmit = async (values: FormValues) => {
    await createTicket.mutateAsync({
      title: values.title,
      category: values.category as TicketCategory,
      description: values.description,
    })
    props.onClose()
  }

  const apiError = isApiError(createTicket.error) ? createTicket.error : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
    >
      <div className="w-full max-w-lg rounded bg-white p-5 shadow">
        <div className="flex items-center justify-between">
          <h2 id={dialogTitleId} className="text-lg font-semibold">
            建立新工單
          </h2>
          <button
            type="button"
            aria-label="關閉對話框"
            className="text-sm text-slate-600 hover:text-slate-900"
            onClick={props.onClose}
          >
            關閉
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="標題" {...register('title')} error={errors.title?.message} />

          <label className="block" htmlFor={categoryId}>
            <div className="text-sm font-medium text-slate-700">分類</div>
            <select
              id={categoryId}
              className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-400"
              aria-invalid={!!errors.category?.message}
              aria-describedby={errors.category?.message ? categoryErrorId : undefined}
              {...register('category')}
            >
              <option value="Account">Account</option>
              <option value="Billing">Billing</option>
              <option value="Technical">Technical</option>
              <option value="Other">Other</option>
            </select>
            {errors.category?.message ? (
              <div id={categoryErrorId} role="alert" className="mt-1 text-xs text-red-600">
                {errors.category.message}
              </div>
            ) : null}
          </label>

          <TextArea label="描述" rows={5} {...register('description')} error={errors.description?.message} />

          {apiError ? (
            <FormError
              message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
            />
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={props.onClose}>
              取消
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? '送出中…' : '送出'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
