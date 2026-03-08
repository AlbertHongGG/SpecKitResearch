import { setTimeout as delay } from 'node:timers/promises';

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

function isRetryableSqliteError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const anyError = error as any;

  // Prisma can wrap driver errors; keep checks defensive.
  if (typeof anyError.code === 'string') {
    // P2034: Transaction failed due to a write conflict or a deadlock
    if (anyError.code === 'P2034') return true;
  }

  const message = typeof anyError.message === 'string' ? anyError.message : '';
  return (
    message.includes('SQLITE_BUSY') ||
    message.includes('database is locked') ||
    message.includes('deadlock') ||
    message.includes('write conflict')
  );
}

export async function withSqliteRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 25;
  const maxDelayMs = opts.maxDelayMs ?? 250;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !isRetryableSqliteError(error)) {
        throw error;
      }

      const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * baseDelayMs);
      await delay(exp + jitter);
    }
  }
}
