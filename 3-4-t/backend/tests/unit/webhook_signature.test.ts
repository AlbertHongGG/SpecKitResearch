import { describe, expect, it } from 'vitest';
import {
  computeWebhookSignature,
  formatWebhookSignatureHeader,
  parseWebhookSignatureHeader,
} from '../../src/domain/webhook/webhook_signature';

describe('webhook signature helpers', () => {
  it('computes deterministic signature and parses header', () => {
    const secret = 'test_secret_1234567890';
    const timestampSec = 1700000000;
    const rawBody = '{"a":1,"b":2}';

    const sig = computeWebhookSignature({ secret, timestampSec, rawBody });
    expect(sig).toMatch(/^[0-9a-f]{64}$/);

    const header = formatWebhookSignatureHeader({ signatureHex: sig });
    expect(header).toBe(`v1=${sig}`);

    const parsed = parseWebhookSignatureHeader(header);
    expect(parsed).toEqual([sig]);
  });

  it('supports multiple signatures in one header', () => {
    const parsed = parseWebhookSignatureHeader('v1=aaa, v1=bbb');
    expect(parsed).toEqual(['aaa', 'bbb']);
  });
});
