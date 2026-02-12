const DEFAULT_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSqliteBusyError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const msg = (err as any).message as string | undefined;
  return !!msg && msg.toLowerCase().includes("sqlite_busy");
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = DEFAULT_RETRIES) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isSqliteBusyError(err) || attempt > retries) throw err;
      const backoff = Math.min(250 * 2 ** (attempt - 1), 2000);
      const jitter = Math.floor(Math.random() * 100);
      await sleep(backoff + jitter);
    }
  }
}
