export type ErrorResponse = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};

export type ApiError = {
  type: 'api';
  status: number;
  error: ErrorResponse;
};

export type NetworkError = {
  type: 'network';
  message: string;
};

export type UnknownError = {
  type: 'unknown';
  message: string;
};

export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === 'string' &&
    typeof v.message === 'string' &&
    typeof v.requestId === 'string'
  );
}

export function toUserFacingMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '發生未知錯誤';

  const e = error as Record<string, unknown>;

  if (e.type === 'api') {
    const api = e as unknown as ApiError;
    switch (api.error.code) {
      case 'AUTH_REQUIRED':
        return '請先登入';
      case 'INVALID_CREDENTIALS':
        return 'Email 或密碼錯誤';
      case 'EMAIL_IN_USE':
        return '此 Email 已被註冊';
      case 'VALIDATION_ERROR':
        return '輸入不合法，請檢查欄位';
      default:
        return api.error.message;
    }
  }

  if (e.type === 'network') {
    return '網路連線失敗，請稍後再試';
  }

  if (e.type === 'unknown') {
    return (e.message as string) ?? '發生未知錯誤';
  }

  return '發生未知錯誤';
}
