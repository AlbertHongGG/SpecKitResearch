import { NextResponse } from "next/server";
import { AppError } from "./AppError";
import { ErrorCodes, type ErrorCode } from "./errorCodes";

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCodes.Unauthenticated:
      return 401;
    case ErrorCodes.Forbidden:
      return 403;
    case ErrorCodes.NotFound:
      return 404;
    case ErrorCodes.ValidationError:
      return 400;
    case ErrorCodes.Conflict:
      return 409;
    case ErrorCodes.InvalidTransition:
      return 409;
    case ErrorCodes.RateLimited:
      return 429;
    case ErrorCodes.ServerError:
    default:
      return 500;
  }
}

export function toErrorResponse(error: unknown, requestId: string) {
  const appError = error instanceof AppError ? error : null;

  const code: ErrorCode = appError?.code ?? ErrorCodes.ServerError;
  const message = appError?.message ?? "Server error";

  const responseBody = {
    error: {
      code,
      message,
      requestId,
      ...(appError?.details ? { details: appError.details } : {}),
    },
  };

  return NextResponse.json(responseBody, { status: statusForCode(code) });
}
