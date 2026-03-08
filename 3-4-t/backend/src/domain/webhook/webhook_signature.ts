import crypto from 'node:crypto';

export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

export function computeWebhookSignature(params: { secret: string; timestampSec: number; rawBody: string }) {
  const msg = `${params.timestampSec}.${params.rawBody}`;
  return crypto.createHmac('sha256', params.secret).update(msg).digest('hex');
}

export function formatWebhookSignatureHeader(params: { signatureHex: string }) {
  return `v1=${params.signatureHex}`;
}

export function parseWebhookSignatureHeader(value: string | string[] | undefined): string[] {
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

export function timingSafeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
