import { describe, expect, it } from 'vitest';

import { parseBearerToken } from '../../src/modules/gateway/bearer';

describe('parseBearerToken', () => {
  it('parses valid Bearer token', () => {
    const parsed = parseBearerToken('Bearer sk_abc123_secret456');
    expect(parsed).toEqual({ keyId: 'abc123', secret: 'secret456' });
  });

  it('allows underscores in secret', () => {
    const parsed = parseBearerToken('Bearer sk_id_part1_part2');
    expect(parsed).toEqual({ keyId: 'id', secret: 'part1_part2' });
  });

  it('returns null for invalid formats', () => {
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken('')).toBeNull();
    expect(parseBearerToken('Basic abc')).toBeNull();
    expect(parseBearerToken('Bearer')).toBeNull();
    expect(parseBearerToken('Bearer sk_onlytwo')).toBeNull();
    expect(parseBearerToken('Bearer xx_abc_secret')).toBeNull();
  });
});
