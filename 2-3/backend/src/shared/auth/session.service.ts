import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../db/prisma.service';
import { getEnv } from '../config/env';

import type { SessionPrincipal } from './auth.types';
import { getSessionCookieSettings } from './session.cookie';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionPrincipalFromRequest(request: FastifyRequest): Promise<SessionPrincipal | null> {
    const env = getEnv();
    const { name: cookieName } = getSessionCookieSettings(env);

    const sessionId = (request.cookies as Record<string, string | undefined> | undefined)?.[cookieName];
    if (!sessionId) return null;

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session) return null;

    const now = new Date();
    if (session.revokedAt) return null;
    if (session.expiresAt <= now) return null;
    if (session.user.status !== 'active') return null;

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now }
    });

    return {
      sessionId: session.id,
      userId: session.userId,
      role: session.user.role,
      status: session.user.status
    };
  }
}
