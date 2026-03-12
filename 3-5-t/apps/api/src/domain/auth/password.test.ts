import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hashes and verifies correct password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(typeof hash).toBe('string');
    expect(await verifyPassword(hash, 'correct-horse-battery-staple')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});
