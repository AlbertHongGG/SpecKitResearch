export type ErrorCode =
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
};

export function toErrorResponse(params: {
  code: ErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}): ErrorResponse {
  return {
    error: {
      code: params.code,
      message: params.message,
      requestId: params.requestId,
      details: params.details,
    },
  };
}
