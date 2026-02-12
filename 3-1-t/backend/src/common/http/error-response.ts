import type { ErrorCode } from './error-codes';

export type ErrorResponse = {
  error_code: ErrorCode;
  message: string;
  request_id?: string;
  details?: unknown;
};
