import type { ApiError } from '../api/http'

export function getErrorMessage(err: unknown): string {
  const e = err as Partial<ApiError> | undefined

  if (!e || typeof e !== 'object') return '發生錯誤，請稍後再試'

  const code = (e as any).code as string | undefined
  if (!code) {
    const status = (e as any).status as number | undefined
    if (status === 401) return '請先登入'
    if (status === 403) return '權限不足'
    if (status === 404) return '找不到資源'
    if (status === 409) return '資料衝突，請稍後再試'
    if (status === 422) return (e as any).message ?? '輸入資料有誤'
    if (status && status >= 500) return '伺服器錯誤，請稍後再試'
    return (e as any).message ?? '發生錯誤，請稍後再試'
  }

  switch (code) {
    case 'AUTH_REQUIRED':
      return '請先登入'
    case 'FULL':
      return '活動名額已滿'
    case 'DEADLINE_PASSED':
      return '已超過報名截止時間'
    case 'STATE_INVALID':
      return '目前狀態不允許此操作'
    case 'NOT_FOUND':
      return '找不到資源'
    case 'FORBIDDEN':
      return '權限不足'
    case 'VALIDATION_FAILED':
      return (e as any).message ?? '輸入資料有誤'
    case 'CONFLICT':
      return (e as any).message ?? '資料衝突，請稍後再試'
    case 'IDEMPOTENCY_IN_PROGRESS':
      return '請求處理中，請稍後再試'
    case 'IDEMPOTENCY_KEY_REUSE':
      return '請求重複提交，請刷新後再試'
    case 'INTERNAL':
      return '伺服器錯誤，請稍後再試'
    default:
      return (e as any).message ?? '發生錯誤，請稍後再試'
  }
}
