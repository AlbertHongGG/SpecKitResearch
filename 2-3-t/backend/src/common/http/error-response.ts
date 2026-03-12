import type { ErrorCode } from './error-codes';

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
  };
};

export function makeErrorResponse(code: ErrorCode, message: string, requestId?: string): ErrorResponse {
  return { error: { code, message, requestId } };
}
