import type { Prisma } from '@prisma/client'

type TransactionHost = {
  $transaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => Promise<T>
}

export type SqliteRetryOptions = {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isSqliteBusyError(error: unknown): boolean {
  if (!error) return false

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  return (
    message.includes('SQLITE_BUSY') ||
    message.includes('database is locked') ||
    message.includes('SQLITE_BUSY_SNAPSHOT')
  )
}

export async function transactionWithSqliteRetry<T>(
  prisma: TransactionHost,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: SqliteRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5
  const baseDelayMs = options.baseDelayMs ?? 25
  const maxDelayMs = options.maxDelayMs ?? 250

  let attempt = 0

  // Retries are only intended for transient SQLite writer locks.
  // If the error is not SQLITE_BUSY, we rethrow immediately.
  while (true) {
    try {
      return await prisma.$transaction(fn)
    } catch (error) {
      if (!isSqliteBusyError(error) || attempt >= maxRetries) {
        throw error
      }

      const exp = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      const jitter = Math.floor(Math.random() * baseDelayMs)
      await sleep(exp + jitter)
      attempt += 1
    }
  }
}
