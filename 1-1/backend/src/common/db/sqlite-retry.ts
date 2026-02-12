function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isSqliteBusyError(err: unknown): boolean {
  const msg = (err as any)?.message
  if (typeof msg !== 'string') return false

  // Prisma + SQLite commonly surfaces lock contention via message text.
  // Examples: "SQLITE_BUSY: database is locked" / "database is locked"
  return msg.includes('SQLITE_BUSY') || msg.toLowerCase().includes('database is locked')
}

export async function withSqliteRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 50

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isSqliteBusyError(err) || attempt === maxAttempts) throw err

      const jitter = Math.floor(Math.random() * baseDelayMs)
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter
      await sleep(delay)
    }
  }

  throw lastError
}
