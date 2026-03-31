import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import { ErrorCodes } from '../../src/common/errors/error-codes';
import { PasswordResetService } from '../../src/auth/password-reset.service';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

function makeConfig(values: Record<string, string>) {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('PasswordResetService', () => {
  it('createResetTokenForEmail() returns null for unknown email', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      passwordResetToken: { create: vi.fn() },
    } as unknown as PrismaService;

    const svc = new PasswordResetService(prisma, makeConfig({ PASSWORD_RESET_EXPIRES_MINUTES: '30' }));
    const token = await svc.createResetTokenForEmail('missing@example.com');

    expect(token).toBeNull();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('token is one-time and respects expiry', async () => {
    const created: {
      tokenHash?: string;
      expiresAt?: Date;
      usedAt?: Date | null;
      userPasswordHash?: string;
    } = {
      usedAt: null,
    };

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1' }),
        update: vi.fn().mockImplementation(async (args: { data: { passwordHash: string } }) => {
          created.userPasswordHash = args.data.passwordHash;
          return { id: 'u1' };
        }),
      },
      passwordResetToken: {
        create: vi.fn().mockImplementation(async (args: { data: { tokenHash: string; expiresAt: Date } }) => {
          created.tokenHash = args.data.tokenHash;
          created.expiresAt = args.data.expiresAt;
          return { id: 't1' };
        }),
        findFirst: vi.fn().mockImplementation(async (args: { where: { tokenHash: string; expiresAt: { gte: Date } } }) => {
          const now = args.where.expiresAt.gte;
          if (!created.tokenHash || !created.expiresAt) return null;
          if (args.where.tokenHash !== created.tokenHash) return null;
          if (created.usedAt !== null) return null;
          if (created.expiresAt.getTime() < now.getTime()) return null;
          return { id: 't1', userId: 'u1' };
        }),
        update: vi.fn().mockImplementation(async (args: { data: { usedAt: Date } }) => {
          created.usedAt = args.data.usedAt;
          return { id: 't1' };
        }),
      },
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          user: prisma.user,
          passwordResetToken: prisma.passwordResetToken,
        };
        return fn(tx);
      }),
    } as unknown as PrismaService;

    const svc = new PasswordResetService(prisma, makeConfig({ PASSWORD_RESET_EXPIRES_MINUTES: '30' }));

    // Deterministic token generation
    vi.spyOn(crypto, 'randomBytes').mockImplementation(((size: number) => {
      return Buffer.from('a'.repeat(size));
    }) as unknown as typeof crypto.randomBytes);

    const raw = await svc.createResetTokenForEmail('u@example.com');
    expect(typeof raw).toBe('string');
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);

    // First reset succeeds
    await svc.resetPassword({ token: raw as string, newPasswordHash: 'new-hash' });
    expect(created.userPasswordHash).toBe('new-hash');
    expect(created.usedAt).not.toBeNull();

    // Second reset with same token fails (one-time)
    await expect(svc.resetPassword({ token: raw as string, newPasswordHash: 'new-hash-2' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    // Expired token fails
    created.usedAt = null;
    created.expiresAt = new Date('2020-01-01T00:00:00.000Z');
    await expect(svc.resetPassword({ token: raw as string, newPasswordHash: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    try {
      await svc.resetPassword({ token: raw as string, newPasswordHash: 'x' });
    } catch (e: unknown) {
      if (!(e instanceof UnauthorizedException)) throw e;
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.PASSWORD_RESET_INVALID });
    }
  });
});
