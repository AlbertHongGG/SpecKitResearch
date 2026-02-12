export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor({ status, code, message }: { status: number; code: string; message: string }) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toApiErrorResponse(error: ApiError): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}
