import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateRefreshToken(): string {
  // 32 bytes -> 64 hex chars
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(refreshToken: string, secret: string): string {
  return createHash('sha256').update(secret).update(':').update(refreshToken).digest('hex');
}

export function verifyRefreshTokenHash(refreshToken: string, expectedHash: string, secret: string): boolean {
  const actual = hashRefreshToken(refreshToken, secret);
  try {
    return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

export function rotateRefreshToken(secret: string): { refreshToken: string; refreshTokenHash: string } {
  const refreshToken = generateRefreshToken();
  return {
    refreshToken,
    refreshTokenHash: hashRefreshToken(refreshToken, secret),
  };
}
