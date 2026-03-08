import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { signRawBody } from '../../src/lib/webhook/signing';

describe('webhook signing', () => {
  it('signs using t + "." + raw_body and lowercase hex', () => {
    const secret = 'test_secret_123';
    const rawBody = Buffer.from('{"ok":true,"n":1}', 'utf8');
    const timestamp = 1700000000;

    const r = signRawBody(secret, rawBody, timestamp);

    const expected = crypto
      .createHmac('sha256', secret)
      .update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]))
      .digest('hex');

    expect(r.timestamp).toBe(timestamp);
    expect(r.signature).toBe(expected);
    expect(r.signature).toMatch(/^[0-9a-f]+$/);
    expect(r.headerValue).toBe(`t=${timestamp},v1=${expected}`);
  });
});
