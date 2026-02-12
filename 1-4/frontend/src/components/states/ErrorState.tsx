import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getHttpErrorKind, HttpError } from '../../api/http'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'

export function ErrorState(props: {
  error: unknown
  title?: string
  actions?: ReactNode
}) {
  const kind = getHttpErrorKind(props.error)

  if (kind === 'forbidden') {
    return <ForbiddenPage />
  }

  if (kind === 'not_found') {
    return <NotFoundPage />
  }

  const title = props.title ?? '發生錯誤'
  const conflictHint =
    props.error instanceof HttpError && props.error.status === 409
      ? '已被他人接手或狀態已變更，請重新整理後再試。'
      : null
  const detail =
    props.error instanceof HttpError
      ? `${props.error.status} ${props.error.apiError?.code ?? ''}`.trim()
      : undefined
  const message =
    props.error instanceof Error
      ? props.error.message
      : typeof props.error === 'string'
        ? props.error
        : 'Unknown error'

  const unauthorizedActions =
    kind === 'unauthorized' ? (
      <Link className="rounded border px-3 py-1 text-sm" to="/login">
        前往登入
      </Link>
    ) : null

  return (
    <div className="p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{message}</div>
      {conflictHint ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {conflictHint}
        </div>
      ) : null}
      {detail ? (
        <div className="mt-2 text-xs text-gray-500">{detail}</div>
      ) : null}
      {props.actions || unauthorizedActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {unauthorizedActions}
          {props.actions}
        </div>
      ) : null}
    </div>
  )
}
