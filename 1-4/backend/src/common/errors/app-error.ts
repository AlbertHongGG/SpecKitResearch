import { ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(params: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}
