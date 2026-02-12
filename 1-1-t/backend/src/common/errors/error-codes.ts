export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',

  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',

  FULL: 'FULL',
  DEADLINE_PASSED: 'DEADLINE_PASSED',
  ENDED: 'ENDED',
  CLOSED: 'CLOSED',

  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const ErrorMessages = {
  UNAUTHENTICATED: 'Unauthenticated',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  CONFLICT: 'Conflict',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
