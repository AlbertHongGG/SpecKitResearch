import crypto from 'node:crypto';

export function verifyWebhook(params: {
  secret: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  now?: Date;
  toleranceSec?: number;
}) {
  const now = params.now ?? new Date();
  const tolerance = params.toleranceSec ?? 5 * 60;
  const tsHeader = params.headers['x-webhook-timestamp'];
  const sigHeader = params.headers['x-webhook-signature'];
  const ts = Number(Array.isArray(tsHeader) ? tsHeader[0] : tsHeader);
  if (!Number.isFinite(ts)) return { ok: false as const, reason: 'missing_timestamp' as const };

  const nowSec = Math.floor(now.getTime() / 1000);
  if (Math.abs(nowSec - ts) > tolerance) return { ok: false as const, reason: 'timestamp_out_of_tolerance' as const };

  const sigs = parseSig(sigHeader);
  if (sigs.length === 0) return { ok: false as const, reason: 'missing_signature' as const };

  const rawBody = stableJsonStringify(params.body);
  const expected = crypto.createHmac('sha256', params.secret).update(`${ts}.${rawBody}`).digest('hex');
  const ok = sigs.some((s) => timingSafeEqualHex(s, expected));
  return ok ? { ok: true as const } : { ok: false as const, reason: 'signature_mismatch' as const };
}

function parseSig(value: string | string[] | undefined) {
  if (!value) return [];
  const joined = Array.isArray(value) ? value.join(',') : value;
  return joined
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const [k, v] = part.split('=', 2);
      if (k?.trim() !== 'v1') return [];
      if (!v?.trim()) return [];
      return [v.trim()];
    });
}

function timingSafeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value instanceof Date) return value.toISOString();
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v === undefined) continue;
      out[key] = normalize(v);
    }
    return out;
  }
  return null;
}
