// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';

import { prisma } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/password';
import * as transactionService from '@/lib/server/services/transactionService';

describe('TransactionService.createTransaction', () => {
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

  async function seedUserAndCategory(opts?: { active?: boolean; userEmail?: string }) {
    const user = await prisma.user.create({
      data: {
        email: opts?.userEmail ?? 'u@example.com',
        passwordHash: await hashPassword('Password123'),
      },
      select: { id: true },
    });

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name: 'Food',
        type: 'expense',
        isActive: opts?.active ?? true,
        isDefault: false,
      },
      select: { id: true },
    });

    return { userId: user.id, categoryId: category.id };
  }

  it('creates a transaction for active category owned by user', async () => {
    const { userId, categoryId } = await seedUserAndCategory();

    const created = await transactionService.createTransaction(userId, {
      type: 'expense',
      amount: 123,
      categoryId,
      date: '2026-02-01',
      note: 'lunch',
    });

    expect(created.userId).toBe(userId);
    expect(created.categoryId).toBe(categoryId);
    expect(created.type).toBe('expense');
    expect(created.amount).toBe(123);
    expect(created.dateKey).toBe('2026-02-01');
    expect(created.note).toBe('lunch');
  });

  it('throws CATEGORY_NOT_FOUND when category does not exist', async () => {
    const { userId } = await seedUserAndCategory();

    await expect(
      transactionService.createTransaction(userId, {
        type: 'expense',
        amount: 1,
        categoryId: 'missing',
        date: '2026-02-01',
      }),
    ).rejects.toMatchObject({ status: 404, code: 'CATEGORY_NOT_FOUND' });
  });

  it('throws FORBIDDEN when category belongs to another user', async () => {
    const a = await seedUserAndCategory({ userEmail: 'a@example.com' });
    const b = await seedUserAndCategory({ userEmail: 'b@example.com' });

    await expect(
      transactionService.createTransaction(a.userId, {
        type: 'expense',
        amount: 1,
        categoryId: b.categoryId,
        date: '2026-02-01',
      }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws CATEGORY_INACTIVE when category is inactive', async () => {
    const { userId, categoryId } = await seedUserAndCategory({ active: false });

    await expect(
      transactionService.createTransaction(userId, {
        type: 'expense',
        amount: 1,
        categoryId,
        date: '2026-02-01',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'CATEGORY_INACTIVE' });
  });
});
