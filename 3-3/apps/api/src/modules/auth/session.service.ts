import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../db/prisma.service';
import { sessionCookieName, sessionCookieOptions } from './cookie.config';

export const SESSION_COOKIE = sessionCookieName();

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(opts: { userId: string }): Promise<{ id: string; expiresAt: Date }> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id,
        userId: opts.userId,
        expiresAt,
      },
    });

    return { id, expiresAt };
  }

  setSessionCookie(res: Response, sessionId: string, expiresAt?: Date): void {
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions(expiresAt));
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({ where: { id: sessionId } });
  }

  async setActiveOrg(sessionId: string, organizationId: string | null): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { activeOrgId: organizationId },
    });
  }
}
