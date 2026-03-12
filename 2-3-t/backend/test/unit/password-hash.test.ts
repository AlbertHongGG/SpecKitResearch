import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { PasswordService } from '../../src/modules/auth/password.service';

describe('PasswordService', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:memdb1?mode=memory&cache=shared';
    process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'test-pepper-0123456789';
    process.env.PASSWORD_MIN_LENGTH = '12';
  });

  it('rejects too-short password', async () => {
    const svc = new PasswordService();
    await expect(svc.hashPassword('short')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hashes and verifies valid password', async () => {
    const svc = new PasswordService();
    const hash = await svc.hashPassword('correct-horse-battery-staple');
    await expect(svc.verifyPassword(hash, 'correct-horse-battery-staple')).resolves.toBeUndefined();
  });

  it('throws UnauthorizedException on wrong password', async () => {
    const svc = new PasswordService();
    const hash = await svc.hashPassword('correct-horse-battery-staple');
    await expect(svc.verifyPassword(hash, 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
