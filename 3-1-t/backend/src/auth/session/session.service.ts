import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { CurrentUser } from '../types';
import { SessionStore } from './session.store';

@Injectable()
export class SessionService {
  constructor(private readonly store: SessionStore) {}

  getCookieName(): string {
    return process.env.SESSION_COOKIE_NAME?.trim() || 'mp_session';
  }

  getTtlSeconds(): number {
    const raw = Number(process.env.SESSION_TTL_SECONDS);
    return Number.isFinite(raw) && raw > 0 ? raw : 60 * 60 * 24 * 14;
  }

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + this.getTtlSeconds() * 1000);

    await this.store.createSession({
      token,
      userId,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async destroy(token: string): Promise<void> {
    await this.store.deleteByToken(token);
  }

  async getCurrentUser(
    token: string | undefined | null,
  ): Promise<CurrentUser | undefined> {
    if (!token) return undefined;

    const session = await this.store.findValidSessionByToken(token, new Date());
    if (!session) return undefined;

    return {
      id: session.userId,
      roles: session.user.roleAssignments.map((ra) => ra.role),
    };
  }
}
