import type { ApiError } from '../../api/errors'

export function ErrorState(props: { error?: unknown; title?: string }) {
  const err = props.error as ApiError | undefined
  return (
    <div className="rounded border border-red-200 bg-white p-6">
      <div className="text-base font-semibold text-red-700">
        {props.title ?? '發生錯誤'}
      </div>
      <div className="mt-2 text-sm text-slate-700">
        {err?.message ?? '請稍後再試'}
      </div>
      {err?.requestId ? (
        <div className="mt-2 text-xs text-slate-500">request_id: {err.requestId}</div>
      ) : null}
    </div>
  )
}
