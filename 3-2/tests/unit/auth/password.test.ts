import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  verifyAndRehashPassword,
  verifyPassword,
} from '../../../apps/backend/src/common/auth/password';

describe('password hashing', () => {
  it('hashes and verifies', async () => {
    const password = 'correct horse battery staple';
    const hash = await hashPassword(password);

    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(10);

    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('verifyAndRehashPassword returns ok and optional newHash', async () => {
    const password = 'rehash-test-password';
    const hash = await hashPassword(password);

    const res = await verifyAndRehashPassword(hash, password);
    expect(res.ok).toBe(true);

    if (res.newHash) {
      expect(await verifyPassword(res.newHash, password)).toBe(true);
    }
  });
});
