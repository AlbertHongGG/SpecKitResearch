import { describe, expect, it, beforeEach } from 'vitest';

import { generateApiKey, parseApiKey } from '../../src/shared/crypto/api-key-format';
import { constantTimeEqualHex, hashApiKeySecret } from '../../src/shared/crypto/api-key-hash';

describe('api key crypto', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.API_KEY_HMAC_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.PASSWORD_HASH_PEPPER = '0123456789abcdef0123456789abcdef';
  });

  it('generateApiKey creates parseable plaintext', () => {
    const generated = generateApiKey();
    expect(generated.plaintext).toMatch(/^ak_/);

    const parsed = parseApiKey(generated.plaintext);
    expect(parsed).not.toBeNull();
    expect(parsed?.publicId).toBe(generated.publicId);
    expect(parsed?.secret).toBe(generated.secret);
  });

  it('parseApiKey returns null for invalid formats', () => {
    expect(parseApiKey('')).toBeNull();
    expect(parseApiKey('ak')).toBeNull();
    expect(parseApiKey('ak__')).toBeNull();
    expect(parseApiKey('bk_foo_bar')).toBeNull();
    expect(parseApiKey('ak_foo')).toBeNull();
  });

  it('hashApiKeySecret is deterministic', () => {
    const a = hashApiKeySecret('secret');
    const b = hashApiKeySecret('secret');
    const c = hashApiKeySecret('different');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('constantTimeEqualHex matches only equal inputs', () => {
    expect(constantTimeEqualHex('aa', 'aa')).toBe(true);
    expect(constantTimeEqualHex('aa', 'ab')).toBe(false);
    expect(constantTimeEqualHex('aa', 'aaaa')).toBe(false);
  });
});
