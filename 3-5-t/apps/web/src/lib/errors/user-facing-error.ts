import { ApiError } from '../api-client';
import { OfflineQueuedError } from '../offline/mutation-queue';

function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const anyErr = err as any;
  const msg = String(anyErr?.message ?? '');
  return anyErr?.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(msg);
}

function requestIdSuffix(requestId?: string): string {
  return requestId ? `（requestId：${requestId}）` : '';
}

export function getUserFacingErrorTitle(err: unknown, fallbackTitle: string = '操作失敗'): string {
  if (err instanceof OfflineQueuedError) return '已離線排隊';

  if (err instanceof ApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return '登入失敗';
    if (err.code === 'EMAIL_ALREADY_REGISTERED') return '註冊失敗';
    if (err.statusCode === 401 || err.code === 'UNAUTHORIZED') return '需要登入';
    if (err.statusCode === 403 || err.code === 'FORBIDDEN') return '權限不足';
    if (err.code === 'VERSION_CONFLICT') return '資料衝突';
    if (err.code === 'WIP_LIMIT_EXCEEDED') return 'WIP 超限';
    if (err.code === 'VALIDATION_ERROR') return '輸入資料有誤';
    if (err.code === 'ARCHIVED_READ_ONLY') return '唯讀限制';
    if (err.code === 'INVALID_TRANSITION') return '狀態不允許';
    if (err.statusCode >= 500 || err.code === 'INTERNAL_ERROR') return '伺服器錯誤';
  }

  if (isLikelyNetworkError(err)) return '網路連線失敗';

  return fallbackTitle;
}

export function getUserFacingErrorMessage(err: unknown, fallbackMessage: string = '操作失敗'): string {
  if (err instanceof OfflineQueuedError) return err.message;

  if (err instanceof ApiError) {
    const suffix = requestIdSuffix(err.requestId);

    if (err.code === 'INVALID_CREDENTIALS') return `帳號或密碼錯誤。${suffix}`;
    if (err.code === 'EMAIL_ALREADY_REGISTERED') return `此 Email 已被註冊，請改用其他信箱或直接登入。${suffix}`;

    if (err.statusCode === 401 || err.code === 'UNAUTHORIZED') return `登入已失效，請重新登入。${suffix}`;
    if (err.statusCode === 403 || err.code === 'FORBIDDEN') return `你沒有權限執行此操作。${suffix}`;
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') return `找不到資源，可能已被刪除或無權限存取。${suffix}`;

    if (err.statusCode === 400) return `請求參數有誤，請重新整理後再試一次。${suffix}`;

    if (err.code === 'VALIDATION_ERROR') return `輸入資料有誤，請檢查後再試一次。${suffix}`;

    if (err.code === 'ARCHIVED_READ_ONLY') return `此資源已封存（唯讀），無法進行修改。${suffix}`;
    if (err.code === 'INVALID_TRANSITION') return `狀態變更不允許，請確認目前狀態後再試一次。${suffix}`;

    if (err.code === 'VERSION_CONFLICT') return `資料已被其他人更新，請重新載入後再試一次。${suffix}`;

    if (err.code === 'WIP_LIMIT_EXCEEDED') {
      const details: any = err.details;
      const wipLimit = typeof details?.wipLimit === 'number' ? details.wipLimit : null;
      const current = typeof details?.currentActiveCount === 'number' ? details.currentActiveCount : null;

      if (wipLimit != null && current != null) {
        return `已達 WIP 上限（${current}/${wipLimit}），請先移出/封存後再試，或使用 override。${suffix}`;
      }
      return `已達 WIP 上限，請先移出/封存後再試，或使用 override。${suffix}`;
    }

    if (err.statusCode >= 500 || err.code === 'INTERNAL_ERROR') return `伺服器發生錯誤，請稍後再試一次。${suffix}`;

    // Default: avoid leaking raw English server messages.
    return `${fallbackMessage}。${suffix}`;
  }

  if (isLikelyNetworkError(err)) return '網路連線失敗，請檢查網路後再試一次。';

  if (err instanceof Error) {
    // Show user-friendly message for unexpected client-side errors.
    return err.message || fallbackMessage;
  }

  return fallbackMessage;
}
