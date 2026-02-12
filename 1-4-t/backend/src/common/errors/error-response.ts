import type { ErrorCode } from './error-codes'

export type ErrorResponse = {
  error: {
    code: ErrorCode | string
    message: string
    request_id?: string | null
  }
}

export function buildErrorResponse(params: {
  code: ErrorCode | string
  message: string
  requestId?: string | null
}): ErrorResponse {
  return {
    error: {
      code: params.code,
      message: params.message,
      request_id: params.requestId ?? null,
    },
  }
}
