import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export type ErrorCode =
  | 'Unauthorized'
  | 'Forbidden'
  | 'NotFound'
  | 'ValidationFailed'
  | 'StateNotAllowed'
  | 'Conflict'
  | 'InternalError';

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  ValidationFailed: 400,
  StateNotAllowed: 422,
  Conflict: 409,
  InternalError: 500,
};

const DEFAULT_MESSAGE_BY_CODE: Readonly<Record<ErrorCode, string>> = {
  Unauthorized: 'Unauthorized',
  Forbidden: 'Forbidden',
  NotFound: 'Not Found',
  ValidationFailed: 'Validation failed',
  StateNotAllowed: 'State not allowed',
  Conflict: 'Conflict',
  InternalError: 'Internal error',
};

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(options: {
    statusCode: number;
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(options.message);
    this.name = 'HttpError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export function httpError(options: {
  code: ErrorCode;
  statusCode?: number;
  message?: string;
  details?: Record<string, unknown>;
}): HttpError {
  const statusCode = options.statusCode ?? STATUS_BY_CODE[options.code];
  const message = options.message ?? DEFAULT_MESSAGE_BY_CODE[options.code];
  return new HttpError({ statusCode, code: options.code, message, details: options.details });
}

export function toErrorResponse(err: {
  code: ErrorCode;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}): ErrorResponse {
  return {
    code: err.code,
    message: err.message,
    requestId: err.requestId,
    ...(err.details ? { details: err.details } : {}),
  };
}

export function unauthorized(message = 'Unauthorized'): HttpError {
  return httpError({ code: 'Unauthorized', message });
}

export function forbidden(message = 'Forbidden'): HttpError {
  return httpError({ code: 'Forbidden', message });
}

export function notFound(message = 'Not Found'): HttpError {
  return httpError({ code: 'NotFound', message });
}

export function conflict(message = 'Conflict', details?: Record<string, unknown>): HttpError {
  return httpError({ code: 'Conflict', message, details });
}

export function validationFailed(message = 'Validation failed', details?: Record<string, unknown>): HttpError {
  return httpError({ code: 'ValidationFailed', message, details });
}

export function stateNotAllowed(message = 'State not allowed', details?: Record<string, unknown>): HttpError {
  return httpError({ code: 'StateNotAllowed', message, details });
}

export function internalError(message = 'Internal error', details?: Record<string, unknown>): HttpError {
  return httpError({ code: 'InternalError', message, details });
}
