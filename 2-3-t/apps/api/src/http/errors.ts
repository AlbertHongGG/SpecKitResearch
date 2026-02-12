import { ZodError } from 'zod';

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(err: unknown, requestId?: string): {
  statusCode: number;
  body: ErrorResponse;
} {
  if (err instanceof HttpError) {
    return {
      statusCode: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          details: err.details,
        },
      },
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          requestId,
          details: err.flatten(),
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId,
      },
    },
  };
}
