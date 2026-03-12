import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { getEnv } from '../../shared/config/env';
import { PrismaService } from '../../shared/db/prisma.service';
import { hashPassword, verifyPassword } from '../../shared/crypto/password-hash';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: { email: string; password: string }): Promise<{
    user_id: string;
    email: string;
    role: 'developer' | 'admin';
    status: 'active' | 'disabled';
    created_at: string;
  }> {
    const email = normalizeEmail(input.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        error: { code: 'conflict', message: 'Email already registered' }
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password),
        role: UserRole.developer,
        status: UserStatus.active
      }
    });

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.createdAt.toISOString()
    };
  }

  async login(input: { email: string; password: string }): Promise<{
    sessionId: string;
    user: { id: string; role: 'developer' | 'admin' };
  }> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new UnauthorizedException();
    if (user.status !== 'active') throw new UnauthorizedException();

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();

    const now = new Date();
    const env = getEnv();
    const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        expiresAt
      }
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now }
    });

    return {
      sessionId: session.id,
      user: { id: user.id, role: user.role }
    };
  }

  async logout(sessionId: string | null | undefined): Promise<void> {
    if (!sessionId) return;

    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}
