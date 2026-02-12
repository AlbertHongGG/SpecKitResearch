import type { ApiError } from './client';

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err;
}

export function formatApiError(err: unknown): string {
  if (!isApiError(err)) return '未知錯誤';
  const codePart = err.code ? ` (${err.code})` : '';
  const requestIdPart = err.requestId ? ` [${err.requestId}]` : '';
  return `${err.status}${codePart}: ${err.message ?? '錯誤'}${requestIdPart}`;
}
