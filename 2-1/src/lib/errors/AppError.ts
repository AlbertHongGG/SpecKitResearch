export class AppError extends Error {
  status: number;
  code: AppErrorCode;
  details?: Record<string, unknown>;

  constructor(status: number, code: AppErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validationFailed(details?: Record<string, unknown>) {
    return new AppError(400, 'VALIDATION_ERROR', '驗證失敗', details);
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = '未登入或登入已失效') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = '無權限') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = '找不到資源') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static internalServerError(message = '伺服器錯誤', details?: Record<string, unknown>) {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR';
