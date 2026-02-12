// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';

import { prisma } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/password';
import * as transactionService from '@/lib/server/services/transactionService';

describe('TransactionService.update/delete', () => {
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

  async function seedUser(email: string) {
    return prisma.user.create({
      data: { email, passwordHash: await hashPassword('Password123') },
      select: { id: true },
    });
  }

  async function seedCategory(userId: string, name: string, isActive = true) {
    return prisma.category.create({
      data: { userId, name, type: 'expense', isActive, isDefault: false },
      select: { id: true },
    });
  }

  async function seedTx(userId: string, categoryId: string) {
    return prisma.transaction.create({
      data: {
        userId,
        categoryId,
        type: 'expense',
        amount: 100,
        dateKey: '2026-02-01',
        date: new Date('2026-02-01T00:00:00.000Z'),
        note: 'n',
      },
      select: { id: true },
    });
  }

  it('updates fields for owner', async () => {
    const user = await seedUser('u@example.com');
    const cat1 = await seedCategory(user.id, 'Food');
    const cat2 = await seedCategory(user.id, 'Other');
    const tx = await seedTx(user.id, cat1.id);

    const updated = await transactionService.updateTransaction(user.id, tx.id, {
      amount: 250,
      categoryId: cat2.id,
      date: '2026-02-02',
      note: 'updated',
    });

    expect(updated.amount).toBe(250);
    expect(updated.categoryId).toBe(cat2.id);
    expect(updated.dateKey).toBe('2026-02-02');
    expect(updated.note).toBe('updated');
  });

  it('throws TX_NOT_FOUND for missing tx', async () => {
    const user = await seedUser('u@example.com');

    await expect(transactionService.updateTransaction(user.id, 'missing', { amount: 1 })).rejects.toMatchObject({
      status: 404,
      code: 'TX_NOT_FOUND',
    });
  });

  it('throws FORBIDDEN when updating another user\'s tx', async () => {
    const u1 = await seedUser('u1@example.com');
    const u2 = await seedUser('u2@example.com');
    const cat2 = await seedCategory(u2.id, 'Food');
    const tx2 = await seedTx(u2.id, cat2.id);

    await expect(transactionService.updateTransaction(u1.id, tx2.id, { amount: 1 })).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects updating to inactive category', async () => {
    const user = await seedUser('u@example.com');
    const activeCat = await seedCategory(user.id, 'Active', true);
    const inactiveCat = await seedCategory(user.id, 'Inactive', false);
    const tx = await seedTx(user.id, activeCat.id);

    await expect(transactionService.updateTransaction(user.id, tx.id, { categoryId: inactiveCat.id })).rejects.toMatchObject({
      status: 422,
      code: 'CATEGORY_INACTIVE',
    });
  });

  it('deletes tx for owner', async () => {
    const user = await seedUser('u@example.com');
    const cat = await seedCategory(user.id, 'Food');
    const tx = await seedTx(user.id, cat.id);

    const res = await transactionService.deleteTransaction(user.id, tx.id);
    expect(res).toEqual({ deleted: true });

    const found = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(found).toBeNull();
  });

  it('throws FORBIDDEN when deleting another user\'s tx', async () => {
    const u1 = await seedUser('u1@example.com');
    const u2 = await seedUser('u2@example.com');
    const cat2 = await seedCategory(u2.id, 'Food');
    const tx2 = await seedTx(u2.id, cat2.id);

    await expect(transactionService.deleteTransaction(u1.id, tx2.id)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
