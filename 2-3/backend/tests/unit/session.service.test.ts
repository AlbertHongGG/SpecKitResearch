import { describe, expect, it, beforeEach, vi } from 'vitest';

import { SessionService } from '../../src/shared/auth/session.service';

describe('SessionService', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.API_KEY_HMAC_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.PASSWORD_HASH_PEPPER = '0123456789abcdef0123456789abcdef';

    process.env.SESSION_COOKIE_NAME = 'ap_session';
    process.env.SESSION_TTL_DAYS = '7';
    process.env.SESSION_COOKIE_SECURE = 'false';
    process.env.SESSION_COOKIE_SAMESITE = 'lax';
  });

  it('returns null when cookie is missing', async () => {
    const prisma = {
      userSession: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    } as any;

    const service = new SessionService(prisma);
    const request = { cookies: {} } as any;

    const principal = await service.getSessionPrincipalFromRequest(request);
    expect(principal).toBeNull();
    expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for revoked/expired/disabled sessions', async () => {
    const now = new Date();

    const prisma = {
      userSession: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    } as any;

    const service = new SessionService(prisma);

    prisma.userSession.findUnique.mockResolvedValueOnce({
      id: 's1',
      userId: 'u1',
      revokedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      user: { role: 'developer', status: 'active' }
    });

    let principal = await service.getSessionPrincipalFromRequest({ cookies: { ap_session: 's1' } } as any);
    expect(principal).toBeNull();

    prisma.userSession.findUnique.mockResolvedValueOnce({
      id: 's2',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(now.getTime() - 1),
      user: { role: 'developer', status: 'active' }
    });

    principal = await service.getSessionPrincipalFromRequest({ cookies: { ap_session: 's2' } } as any);
    expect(principal).toBeNull();

    prisma.userSession.findUnique.mockResolvedValueOnce({
      id: 's3',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 60_000),
      user: { role: 'developer', status: 'disabled' }
    });

    principal = await service.getSessionPrincipalFromRequest({ cookies: { ap_session: 's3' } } as any);
    expect(principal).toBeNull();
  });

  it('returns principal for valid session and updates lastSeenAt', async () => {
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const prisma = {
      userSession: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    } as any;

    prisma.userSession.findUnique.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 60_000),
      user: { role: 'admin', status: 'active' }
    });

    prisma.userSession.update.mockResolvedValue({});

    const service = new SessionService(prisma);
    const principal = await service.getSessionPrincipalFromRequest({ cookies: { ap_session: 's1' } } as any);

    expect(principal).toEqual({ sessionId: 's1', userId: 'u1', role: 'admin', status: 'active' });
    expect(prisma.userSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { lastSeenAt: now }
    });

    vi.useRealTimers();
  });
});
