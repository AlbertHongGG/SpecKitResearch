import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { env } from '../common/config/env';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';

const REFRESH_SECRET_BYTES = 32;

function buildRefreshToken(sessionId: string, secret: string) {
  return `${sessionId}.${secret}`;
}

function parseRefreshToken(refreshToken: string) {
  const parts = refreshToken.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, secret] = parts;
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

@Injectable()
export class AuthSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(params: {
    userId: string;
    userAgent?: string;
    ip?: string;
  }) {
    const session = await this.prisma.authSession.create({
      data: {
        userId: params.userId,
        refreshTokenHash: '',
        expiresAt: new Date(
          Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
        userAgent: params.userAgent,
        ip: params.ip,
      },
    });

    const secret = randomBytes(REFRESH_SECRET_BYTES).toString('hex');
    const refreshTokenHash = await bcrypt.hash(secret, 12);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    return {
      sessionId: session.id,
      refreshToken: buildRefreshToken(session.id, secret),
    };
  }

  async rotateSession(refreshToken: string) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_REFRESH_INVALID,
        message: 'Invalid refresh token',
      });
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: parsed.sessionId },
    });
    if (!session || session.revokedAt) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_REFRESH_INVALID,
        message: 'Refresh session revoked',
      });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_REFRESH_INVALID,
        message: 'Refresh session expired',
      });
    }

    const ok = await bcrypt.compare(parsed.secret, session.refreshTokenHash);
    if (!ok) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_REFRESH_INVALID,
        message: 'Refresh token mismatch',
      });
    }

    const newSecret = randomBytes(REFRESH_SECRET_BYTES).toString('hex');
    const newHash = await bcrypt.hash(newSecret, 12);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        lastUsedAt: new Date(),
      },
    });

    return {
      userId: session.userId,
      sessionId: session.id,
      refreshToken: buildRefreshToken(session.id, newSecret),
    };
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
