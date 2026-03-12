export const ErrorCodes = {
  BadRequest: 'bad_request',
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  NotFound: 'not_found',
  Conflict: 'conflict',
  RateLimited: 'rate_limited',
  Internal: 'internal_error',
  ServiceUnavailable: 'service_unavailable'
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
