import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SessionService } from '../../src/domain/auth/session_service';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('SessionService', () => {
  let prisma: PrismaClient;
  let service: SessionService;
  let userId: string;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    const user = await prisma.user.create({
      data: { email: 'u@example.com', password_hash: 'x', role: 'USER_DEVELOPER' },
    });
    userId = user.id;
    service = new SessionService({ prisma, ttlSec: 60 });
  });

  it('creates and validates session', async () => {
    const session = await service.createSession({ userId });
    const validated = await service.validateSession(session.sid);
    expect(validated?.user.id).toBe(userId);
  });

  it('revoked session is invalid', async () => {
    const session = await service.createSession({ userId });
    await service.revokeSession(session.sid);
    const validated = await service.validateSession(session.sid);
    expect(validated).toBeNull();
  });
});
