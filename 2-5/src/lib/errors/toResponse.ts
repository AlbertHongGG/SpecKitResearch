import { ApiError } from "./apiError";
import { ErrorCodes } from "./codes";

export function errorToResponse(err: unknown, requestId: string) {
  const apiError = err instanceof ApiError ? err : undefined;

  const status = apiError?.status ?? 500;
  const code = apiError?.code ?? ErrorCodes.INTERNAL_ERROR;
  const message = apiError?.expose ? apiError.message : "伺服器錯誤";

  const body: any = {
    error: {
      code,
      message,
      requestId,
    },
  };

  if (apiError?.code === ErrorCodes.VALIDATION_FAILED && apiError.details) {
    body.error.details = apiError.details;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}
