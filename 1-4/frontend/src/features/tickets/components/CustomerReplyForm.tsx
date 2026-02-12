import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateTicketMessageMutation } from '../api/tickets.queries'

const Schema = z
  .object({
    content: z.string().min(1),
  })
  .strict()

type FormValues = z.infer<typeof Schema>

export function CustomerReplyForm(props: {
  ticketId: string
  disabled?: boolean
}) {
  const mutation = useCreateTicketMessageMutation({ ticketId: props.ticketId })

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { content: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values)
    form.reset({ content: '' })
  })

  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <textarea
        className="min-h-24 w-full rounded border px-3 py-2 text-sm"
        placeholder="輸入回覆內容"
        disabled={props.disabled || mutation.isPending}
        {...form.register('content')}
      />
      <div className="flex items-center justify-between">
        {form.formState.errors.content ? (
          <div className="text-xs text-red-600">
            {form.formState.errors.content.message}
          </div>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={props.disabled || mutation.isPending}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          送出回覆
        </button>
      </div>
    </form>
  )
}
