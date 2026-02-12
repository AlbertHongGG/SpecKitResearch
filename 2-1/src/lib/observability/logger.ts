const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'session',
  'cookie',
  'cookies',
  'authorization',
  'secret',
  'sessionSecret',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (REDACT_KEYS.has(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }

  return '[UNSERIALIZABLE]';
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(message, sanitize(meta ?? {}));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(message, sanitize(meta ?? {}));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(message, sanitize(meta ?? {}));
  },
};
