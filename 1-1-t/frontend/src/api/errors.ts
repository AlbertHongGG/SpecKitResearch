export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(input: { status: number; code: string; message: string; details?: Record<string, unknown> }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

function messageForCode(code: string): string | undefined {
  switch (code) {
    case 'AUTH_REQUIRED':
      return '請先登入';
    case 'INVALID_CREDENTIALS':
      return '帳號或密碼錯誤';
    case 'FORBIDDEN':
      return '你沒有權限執行此操作';
    case 'NOT_FOUND':
      return '找不到資源';
    case 'VALIDATION_ERROR':
      return '輸入資料有誤';
    case 'CONFLICT':
      return '操作衝突，請稍後再試';
    case 'FULL':
      return '活動已額滿';
    case 'DEADLINE_PASSED':
      return '已超過報名截止時間';
    case 'ENDED':
      return '活動已結束';
    case 'CLOSED':
      return '已關閉報名';
    case 'INTERNAL_ERROR':
      return '伺服器發生錯誤';
    default:
      return undefined;
  }
}

export function toToastError(err: unknown, fallbackMessage: string): {
  message: string;
  code?: string;
} {
  if (err instanceof ApiError) {
    return {
      message: messageForCode(err.code) ?? err.message,
      code: err.code,
    };
  }

  return { message: fallbackMessage };
}
