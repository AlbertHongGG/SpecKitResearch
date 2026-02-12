import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import {
  type ApiTicketCategory,
  useCreateTicketMutation,
} from '../../features/tickets/api/tickets.queries'

const CategorySchema = z.enum(['Account', 'Billing', 'Technical', 'Other'])

const Schema = z
  .object({
    title: z.string().min(1).max(100),
    category: CategorySchema,
    description: z.string().min(1),
  })
  .strict()

type FormValues = z.infer<typeof Schema>

export function CreateTicketPage() {
  const navigate = useNavigate()
  const createTicket = useCreateTicketMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { title: '', category: 'Technical', description: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await createTicket.mutateAsync({
      title: values.title,
      category: values.category as ApiTicketCategory,
      description: values.description,
    })

    navigate(`/tickets/${res.ticket.id}`)
  })

  return (
    <div className="mx-auto max-w-lg rounded border bg-white p-4">
      <h1 className="text-lg font-semibold">建立工單</h1>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="text-sm" htmlFor="title">
            標題
          </label>
          <input
            id="title"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            {...form.register('title')}
          />
          {form.formState.errors.title ? (
            <div className="mt-1 text-xs text-red-600">
              {form.formState.errors.title.message}
            </div>
          ) : null}
        </div>

        <div>
          <label className="text-sm" htmlFor="category">
            類別
          </label>
          <select
            id="category"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            {...form.register('category')}
          >
            <option value="Account">Account</option>
            <option value="Billing">Billing</option>
            <option value="Technical">Technical</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm" htmlFor="description">
            描述
          </label>
          <textarea
            id="description"
            className="mt-1 min-h-32 w-full rounded border px-3 py-2 text-sm"
            {...form.register('description')}
          />
          {form.formState.errors.description ? (
            <div className="mt-1 text-xs text-red-600">
              {form.formState.errors.description.message}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={createTicket.isPending}
          className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {createTicket.isPending ? '建立中…' : '建立'}
        </button>
      </form>
    </div>
  )
}
