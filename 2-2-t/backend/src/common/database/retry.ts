export async function withSqliteBusyRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; baseDelayMs?: number }) {
  const retries = opts?.retries ?? 5;
  const baseDelayMs = opts?.baseDelayMs ?? 25;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      const isBusy = msg.includes('SQLITE_BUSY') || msg.includes('database is locked');
      if (!isBusy || attempt >= retries) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
