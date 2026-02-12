export const ERROR_CODES = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'FULL',
  'DEADLINE_PASSED',
  'STATE_INVALID',
  'CONFLICT',
  'INTERNAL',
  'IDEMPOTENCY_IN_PROGRESS',
  'IDEMPOTENCY_KEY_REUSE',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export const ERROR_CODE_DESCRIPTIONS: Record<ErrorCode, string> = {
  AUTH_REQUIRED: '需要登入或登入資訊無效提醒',
  FORBIDDEN: '已登入但權限不足',
  NOT_FOUND: '資源不存在',
  VALIDATION_FAILED: '輸入資料不合法（包含欄位驗證或商業規則）',
  FULL: '活動名額已滿（409）',
  DEADLINE_PASSED: '已超過報名/取消截止（422）',
  STATE_INVALID: '目前狀態不允許此操作（422）',
  CONFLICT: '通用衝突（409）',
  INTERNAL: '伺服器內部錯誤（500）',
  IDEMPOTENCY_IN_PROGRESS: '相同冪等鍵正在處理中（409）',
  IDEMPOTENCY_KEY_REUSE: '同一冪等鍵用於不同 request（409）',
}
