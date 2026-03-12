export type SqliteRetryOptions = {
    retries: number;
    baseDelayMs: number;
    maxDelayMs: number;
};

const DEFAULTS: SqliteRetryOptions = {
    retries: 3,
    baseDelayMs: 15,
    maxDelayMs: 200,
};

function isSqliteBusyError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const msg = (err as { message?: unknown }).message;
    if (typeof msg !== 'string') return false;
    return /SQLITE_BUSY|database is locked|SQLITE_BUSY_SNAPSHOT/i.test(msg);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sqliteRetry<T>(fn: () => Promise<T>, options?: Partial<SqliteRetryOptions>): Promise<T> {
    const opts: SqliteRetryOptions = { ...DEFAULTS, ...(options ?? {}) };

    let attempt = 0;
    // retries means additional attempts after the first.
    while (true) {
        try {
            return await fn();
        } catch (err) {
            if (!isSqliteBusyError(err) || attempt >= opts.retries) throw err;
            const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt));
            const jitter = Math.floor(Math.random() * opts.baseDelayMs);
            await sleep(exp + jitter);
            attempt += 1;
        }
    }
}
