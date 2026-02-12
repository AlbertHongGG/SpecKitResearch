import type { ErrorCode } from './error-codes'

export interface ErrorResponse {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

export function makeError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  return details ? { code, message, details } : { code, message }
}
