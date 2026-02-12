import { ErrorCode, ErrorCodes } from "./codes";

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly expose: boolean;
  public readonly details?: unknown;

  constructor(opts: { code: ErrorCode; message: string; status: number; expose?: boolean; details?: unknown }) {
    super(opts.message);
    this.code = opts.code;
    this.status = opts.status;
    this.expose = opts.expose ?? true;
    this.details = opts.details;
  }

  static notAuthenticated(message = "需要登入") {
    return new ApiError({ code: ErrorCodes.NOT_AUTHENTICATED, status: 401, message, expose: true });
  }

  static forbidden(message = "權限不足") {
    return new ApiError({ code: ErrorCodes.FORBIDDEN, status: 403, message, expose: true });
  }

  static notFound(message = "找不到資源") {
    return new ApiError({ code: ErrorCodes.NOT_FOUND, status: 404, message, expose: true });
  }

  static conflict(message = "狀態衝突") {
    return new ApiError({ code: ErrorCodes.CONFLICT, status: 409, message, expose: true });
  }

  static validation(details?: unknown, message = "驗證失敗") {
    return new ApiError({ code: ErrorCodes.VALIDATION_FAILED, status: 422, message, expose: true, details });
  }

  static tooManyRequests(message = "操作過於頻繁") {
    return new ApiError({ code: ErrorCodes.RATE_LIMITED, status: 429, message, expose: true });
  }

  static internal(message = "伺服器錯誤") {
    return new ApiError({ code: ErrorCodes.INTERNAL_ERROR, status: 500, message, expose: true });
  }
}
