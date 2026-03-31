import type { ZodError } from 'zod'

export function zodFirstErrorMessage(err: ZodError): string {
  const first = err.issues[0]
  return first?.message ?? '輸入驗證失敗'
}
