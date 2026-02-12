import { describe, it, expect } from 'vitest';
import { SessionService } from '../../../src/modules/auth/session.service.js';

describe('SessionService', () => {
  it('returns null for revoked session', async () => {
    const prisma = {
      session: {
        findUnique: async () => ({
          id: 's1',
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 10000),
          user: { id: 'u1', isActive: true, email: 'a@b.com', role: 'student' },
        }),
      },
    } as any;
    const service = new SessionService(prisma);
    const result = await service.getValidSession('s1');
    expect(result).toBeNull();
  });

  it('returns null for inactive user', async () => {
    const prisma = {
      session: {
        findUnique: async () => ({
          id: 's1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 10000),
          user: { id: 'u1', isActive: false, email: 'a@b.com', role: 'student' },
        }),
      },
    } as any;
    const service = new SessionService(prisma);
    const result = await service.getValidSession('s1');
    expect(result).toBeNull();
  });
});
