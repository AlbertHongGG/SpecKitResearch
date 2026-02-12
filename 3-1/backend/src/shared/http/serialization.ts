const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'tokenHash',
  'token_hash',
  'sessionToken',
  'pepper',
  'SESSION_TOKEN_HASH_PEPPER',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function sanitizeForJson(value: unknown, opts?: { maxDepth?: number }): unknown {
  const maxDepth = opts?.maxDepth ?? 20;

  const walk = (v: unknown, depth: number): unknown => {
    if (depth > maxDepth) return null;
    if (v === null || v === undefined) return v;

    if (v instanceof Date) return v.toISOString();

    if (Array.isArray(v)) {
      return v.map((item) => walk(item, depth + 1));
    }

    if (isPlainObject(v)) {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(v)) {
        if (SENSITIVE_KEYS.has(key)) continue;
        out[key] = walk(val, depth + 1);
      }
      return out;
    }

    return v;
  };

  return walk(value, 0);
}
