import { describe, expect, it } from 'vitest';

import { hmacSha256Hex, timingSafeEqualHex } from '../../src/modules/keys/api-key.hash';

describe('api key hashing', () => {
  it('hmacSha256Hex is deterministic', () => {
    const a = hmacSha256Hex('pepper', 'secret');
    const b = hmacSha256Hex('pepper', 'secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('timingSafeEqualHex returns true only for exact match', () => {
    const a = hmacSha256Hex('pepper', 'secret');
    const b = hmacSha256Hex('pepper', 'secret2');
    expect(timingSafeEqualHex(a, a)).toBe(true);
    expect(timingSafeEqualHex(a, b)).toBe(false);
  });

  it('timingSafeEqualHex returns false for different lengths', () => {
    expect(timingSafeEqualHex('aa', 'aaaa')).toBe(false);
  });
});
