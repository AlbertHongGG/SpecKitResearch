export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CSRF_FAILED'
  | 'INTERNAL_ERROR';

export type ApiErrorEnvelope = {
  ok: false;
  requestId: string;
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: unknown;
  };
};

export class ApiError extends Error {
  requestId?: string;
  code?: ErrorCode;
  fieldErrors?: Record<string, string[]>;
  status?: number;

  constructor(message: string, init?: Partial<ApiError>) {
    super(message);
    Object.assign(this, init);
  }
}

export function isApiErrorEnvelope(input: any): input is ApiErrorEnvelope {
  return (
    input &&
    typeof input === 'object' &&
    input.ok === false &&
    typeof input.requestId === 'string' &&
    input.error &&
    typeof input.error.code === 'string'
  );
}
