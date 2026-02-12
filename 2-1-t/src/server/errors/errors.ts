import type { ErrorCode } from './errorResponse';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'HttpError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'DomainError';
    this.code = params.code;
    this.details = params.details;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof Error && (err as HttpError).name === 'HttpError';
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof Error && (err as DomainError).name === 'DomainError';
}
