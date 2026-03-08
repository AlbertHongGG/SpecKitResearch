export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'IDEMPOTENT_REPLAY'
  | 'INTERNAL_ERROR';

export type ErrorResponse = {
  errorCode: ErrorCode;
  message: string;
  requestId?: string;
};
