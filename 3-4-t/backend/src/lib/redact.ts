type JsonLike = null | boolean | number | string | JsonLike[] | { [k: string]: JsonLike };

const DEFAULT_REDACT_KEYS = [
  'password',
  'cookie',
  'set-cookie',
  'authorization',
  'x-signature',
  'signature',
  'secret',
  'token',
  'sid',
  'session',
];

function shouldRedactKey(key: string) {
  const k = key.toLowerCase();
  return DEFAULT_REDACT_KEYS.some((p) => k.includes(p));
}

function redactScalar(value: unknown): string {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 8) return '[REDACTED]';
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}

export function redact<T>(input: T): T {
  return _redactAny(input) as T;
}

function _redactAny(input: unknown): JsonLike {
  if (input == null) return input as any;
  if (Array.isArray(input)) return input.map(_redactAny) as any;
  if (typeof input === 'object') {
    const o = input as Record<string, unknown>;
    const out: Record<string, JsonLike> = {};
    for (const [k, v] of Object.entries(o)) {
      if (shouldRedactKey(k)) {
        out[k] = redactScalar(v) as any;
      } else {
        out[k] = _redactAny(v);
      }
    }
    return out as any;
  }
  return input as any;
}
