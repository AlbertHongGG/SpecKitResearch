import type { ApiError } from '../../api/http';

export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return '發生未知錯誤';
}

export function formatApiError(err: ApiError): string {
  const code = err.data?.code;
  const msg = err.data?.message;

  if (code === 'unauthorized') return '登入已失效，請重新登入。';
  if (code === 'forbidden') return '你沒有權限執行此操作。';
  if (code === 'not_found') return '找不到資料。';
  if (code === 'conflict') return msg ?? '狀態衝突或日期重疊，請確認後再試。';
  if (code === 'validation_error') return msg ?? '欄位驗證失敗，請檢查輸入。';

  if (err.status >= 500) return '伺服器發生錯誤，請稍後再試。';
  return msg ?? `Request failed (${err.status})`;
}
