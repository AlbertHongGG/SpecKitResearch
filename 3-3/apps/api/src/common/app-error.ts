import type { ErrorCode } from '@sb/shared';

export class AppError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly status: number;

  constructor(opts: { errorCode: ErrorCode; status: number; message: string }) {
    super(opts.message);
    this.errorCode = opts.errorCode;
    this.status = opts.status;
  }
}

export function isAppError(e: unknown): e is AppError {
  return typeof e === 'object' && e !== null && 'errorCode' in e && 'status' in e;
}
