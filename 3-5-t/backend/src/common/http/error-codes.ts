export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function errorCodeFromHttpStatus(status: number): ErrorCode {
  // Keep mapping aligned with HttpExceptionFilter.
  if (status === 401) return ErrorCodes.UNAUTHORIZED;
  if (status === 403) return ErrorCodes.FORBIDDEN;
  if (status === 404) return ErrorCodes.NOT_FOUND;
  if (status === 429) return ErrorCodes.RATE_LIMITED;
  if (status === 400) return ErrorCodes.VALIDATION_ERROR;
  if (status === 409) return ErrorCodes.CONFLICT;
  if (status === 502 || status === 504) return ErrorCodes.UPSTREAM_ERROR;
  if (status === 503) return ErrorCodes.SERVICE_UNAVAILABLE;
  return ErrorCodes.INTERNAL_ERROR;
}
