export function isUniqueConstraintError(err: unknown): boolean {
  const anyErr = err as any;
  return typeof anyErr?.code === 'string' && anyErr.code === 'P2002';
}

export function isSqliteBusyOrLockedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('SQLITE_BUSY') ||
    message.includes('SQLITE_LOCKED') ||
    message.toLowerCase().includes('database is locked')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 25;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !isSqliteBusyOrLockedError(err)) throw err;
      const delay = baseDelayMs * Math.min(10, 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
