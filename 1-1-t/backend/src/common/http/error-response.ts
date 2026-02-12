import type { ErrorCode } from '../errors/error-codes';

export type ErrorResponse = {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
};
