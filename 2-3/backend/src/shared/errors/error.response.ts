import type { ErrorCode } from './error.codes';

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    request_id?: string;
  };
};

export function toErrorResponse(params: {
  code: ErrorCode;
  message: string;
  requestId?: string;
}): ErrorResponse {
  return {
    error: {
      code: params.code,
      message: params.message,
      request_id: params.requestId
    }
  };
}
