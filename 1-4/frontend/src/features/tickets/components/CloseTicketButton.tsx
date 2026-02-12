import { useChangeTicketStatusMutation } from '../api/tickets.queries'

export function CloseTicketButton(props: {
  ticketId: string
  disabled?: boolean
}) {
  const mutation = useChangeTicketStatusMutation({ ticketId: props.ticketId })

  return (
    <button
      type="button"
      disabled={props.disabled || mutation.isPending}
      className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
      onClick={() => {
        void mutation.mutateAsync({
          from_status: 'Resolved',
          to_status: 'Closed',
        })
      }}
    >
      {mutation.isPending ? '關閉中…' : '關閉工單'}
    </button>
  )
}
