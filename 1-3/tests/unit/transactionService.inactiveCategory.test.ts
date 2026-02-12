// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';

import { prisma } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/password';
import * as transactionService from '@/lib/server/services/transactionService';

describe('TransactionService inactive category rule', () => {
  setupApiTestEnv();

  beforeAll(async () => {
    migrateTestDb();
  });

  beforeEach(async () => {
    await wipeDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('cannot create transaction with inactive category', async () => {
    const user = await prisma.user.create({
      data: { email: 'u@example.com', passwordHash: await hashPassword('Password123') },
      select: { id: true },
    });

    const cat = await prisma.category.create({
      data: {
        userId: user.id,
        name: 'Old',
        type: 'expense',
        isActive: false,
        isDefault: false,
      },
      select: { id: true },
    });

    await expect(
      transactionService.createTransaction(user.id, {
        type: 'expense',
        amount: 10,
        categoryId: cat.id,
        date: '2026-02-01',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'CATEGORY_INACTIVE' });
  });
});
