import { describe, expect, it } from 'vitest';
import { hashRefreshToken, rotateRefreshToken, verifyRefreshTokenHash } from './refresh-tokens';

describe('refresh tokens', () => {
  it('hash/verify works', () => {
    const secret = 'secret-123';
    const token = 'abc';
    const hash = hashRefreshToken(token, secret);
    expect(verifyRefreshTokenHash(token, hash, secret)).toBe(true);
    expect(verifyRefreshTokenHash('nope', hash, secret)).toBe(false);
  });

  it('rotation yields a new token and matching hash', () => {
    const secret = 'secret-123';
    const rotated = rotateRefreshToken(secret);
    expect(rotated.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyRefreshTokenHash(rotated.refreshToken, rotated.refreshTokenHash, secret)).toBe(true);
  });
});
