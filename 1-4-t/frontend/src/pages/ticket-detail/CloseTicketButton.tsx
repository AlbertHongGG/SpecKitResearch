import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { useChangeStatus } from '../../api/ticketActions'
import { isApiError } from '../../api/errors'

export function CloseTicketButton(props: { ticketId: string; disabled?: boolean }) {
  const changeStatus = useChangeStatus(props.ticketId)
  const apiError = isApiError(changeStatus.error) ? changeStatus.error : null

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">結案</div>
          <div className="text-xs text-slate-600">Resolved 後可關閉為 Closed（終態）。</div>
        </div>
        <Button
          type="button"
          disabled={props.disabled || changeStatus.isPending}
          onClick={() => changeStatus.mutate({ from_status: 'Resolved', to_status: 'Closed' })}
        >
          {changeStatus.isPending ? '處理中…' : '關閉工單'}
        </Button>
      </div>
      {apiError ? (
        <div className="mt-3">
          <FormError
            message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
          />
        </div>
      ) : null}
    </div>
  )
}
