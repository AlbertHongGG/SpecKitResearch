import type { ErrorCode } from './errorCodes';

export type ErrorResponse = {
  code: ErrorCode | string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(args: {
    code: ErrorCode;
    status: number;
    message: string;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = 'AppError';
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
    if (args.cause) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = args.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function makeErrorResponse(args: {
  code: ErrorCode | string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}): ErrorResponse {
  return {
    code: args.code,
    message: args.message,
    requestId: args.requestId,
    ...(args.details ? { details: args.details } : {}),
  };
}
