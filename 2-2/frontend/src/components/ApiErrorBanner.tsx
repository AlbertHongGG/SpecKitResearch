import { ApiError } from '../api/http'
import { Alert } from './Alert'

export function ApiErrorBanner(props: { error: unknown; fallbackMessage?: string }) {
  const { error, fallbackMessage = 'Something went wrong' } = props

  if (!error) return null

  if (error instanceof ApiError) {
    return <Alert tone="error" message={`${error.message} (requestId: ${error.requestId})`} />
  }

  return <Alert tone="error" message={fallbackMessage} />
}
