import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { PrismaService } from '../../src/common/db/prisma.service';
import { RateLimitService } from '../../src/modules/rate-limit/rate-limit.service';
import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';

describe('RateLimitService (SQLite counters)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('unit-rate-limit');
  let prisma: PrismaService;
  let svc: RateLimitService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.API_KEY_PEPPER = 'test-pepper-0123456789';
    migrateDatabase(databaseUrl);

    prisma = new PrismaService();
    await prisma.onModuleInit();
    svc = new RateLimitService(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });

  it('denies after exceeding fixed window limits', async () => {
    const keyId = 'k_test';
    const limits = { minute: 2, hour: 100 };

    const a = await svc.checkAndIncrement(keyId, limits);
    expect(a.allowed).toBe(true);
    const b = await svc.checkAndIncrement(keyId, limits);
    expect(b.allowed).toBe(true);
    const c = await svc.checkAndIncrement(keyId, limits);
    expect(c.allowed).toBe(false);

    expect(c.minute.limit).toBe(2);
    expect(c.minute.remaining).toBe(0);
  });
});
