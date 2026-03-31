import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { UserRole, UserStatus } from '../../src/generated/prisma/client';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { AuthService } from '../../src/auth/auth.service';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

function makeConfig(values: Record<string, string>) {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('AuthService', () => {
  it('register() returns accessToken + user', async () => {
    const prisma = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@example.com',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2026-03-04T00:00:00.000Z'),
        }),
      },
    } as unknown as PrismaService;

    const auth = new AuthService(prisma, makeConfig({ JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '15m' }));
    vi.spyOn(auth, 'hashPassword').mockResolvedValue('hash');

    const res = await auth.register({
      email: 'a@example.com',
      password: 'password123',
      role: UserRole.USER,
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(res.user).toEqual({
      id: 'u1',
      email: 'a@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    expect(typeof res.accessToken).toBe('string');
    const payload = auth.verifyAccessToken(res.accessToken);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe(UserRole.USER);
  });

  it('login() rejects suspended users', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u2',
          email: 's@example.com',
          passwordHash: 'hash',
          role: UserRole.USER,
          status: UserStatus.SUSPENDED,
          createdAt: new Date('2026-03-04T00:00:00.000Z'),
        }),
      },
    } as unknown as PrismaService;

    const auth = new AuthService(prisma, makeConfig({ JWT_SECRET: 'test-secret' }));
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(true);

    await expect(auth.login({ email: 's@example.com', password: 'password123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    try {
      await auth.login({ email: 's@example.com', password: 'password123' });
    } catch (e: unknown) {
      if (!(e instanceof UnauthorizedException)) throw e;
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.AUTH_USER_SUSPENDED });
    }
  });

  it('login() rejects invalid credentials', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u3',
          email: 'x@example.com',
          passwordHash: 'hash',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2026-03-04T00:00:00.000Z'),
        }),
      },
    } as unknown as PrismaService;

    const auth = new AuthService(prisma, makeConfig({ JWT_SECRET: 'test-secret' }));
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(false);

    await expect(auth.login({ email: 'x@example.com', password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    try {
      await auth.login({ email: 'x@example.com', password: 'wrong' });
    } catch (e: unknown) {
      if (!(e instanceof UnauthorizedException)) throw e;
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.AUTH_INVALID_CREDENTIALS });
    }
  });
});
