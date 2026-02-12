import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/server/password';

describe('password', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');

    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
