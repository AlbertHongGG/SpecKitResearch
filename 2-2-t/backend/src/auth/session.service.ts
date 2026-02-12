import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getCookieName(): string {
    return this.config.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
  }

  getTtlSeconds(): number {
    return Number(this.config.get('SESSION_TTL_SECONDS') ?? 1209600);
  }

  createToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(params: { userId: string; ip?: string; userAgent?: string }) {
    const token = this.createToken();
    const tokenHash = this.hashToken(token);
    const ttlSeconds = this.getTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        sessionTokenHash: tokenHash,
        expiresAt,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });

    return { token, session };
  }

  async revokeSessionByToken(token: string, reason?: string) {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.session.findUnique({ where: { sessionTokenHash: tokenHash } });
    if (!session) return null;

    return await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: session.revokedAt ?? new Date(),
        revokedReason: session.revokedReason ?? reason ?? 'logout',
      },
    });
  }
}
