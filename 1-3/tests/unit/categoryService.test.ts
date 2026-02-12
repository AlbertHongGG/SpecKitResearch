// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';

import { prisma } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/password';
import * as categoryService from '@/lib/server/services/categoryService';

describe('CategoryService', () => {
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

  it('creates category and enforces unique name per user', async () => {
    const user = await seedUser('u@example.com');

    const c1 = await categoryService.createCategory(user.id, { name: 'Food', type: 'expense' });
    expect(c1.name).toBe('Food');

    await expect(categoryService.createCategory(user.id, { name: 'Food', type: 'expense' })).rejects.toMatchObject({
      status: 409,
      code: 'CATEGORY_NAME_TAKEN',
    });
  });

  it('updates category fields for owner', async () => {
    const user = await seedUser('u@example.com');
    const c1 = await categoryService.createCategory(user.id, { name: 'Food', type: 'expense' });

    const updated = await categoryService.updateCategory(user.id, c1.id, { name: 'Food2', isActive: false });
    expect(updated.name).toBe('Food2');
    expect(updated.isActive).toBe(false);
  });

  it('throws FORBIDDEN when updating category of another user', async () => {
    const u1 = await seedUser('u1@example.com');
    const u2 = await seedUser('u2@example.com');
    const c2 = await categoryService.createCategory(u2.id, { name: 'X', type: 'expense' });

    await expect(categoryService.updateCategory(u1.id, c2.id, { name: 'Y' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('throws CATEGORY_NOT_FOUND when category missing', async () => {
    const user = await seedUser('u@example.com');
    await expect(categoryService.updateCategory(user.id, 'missing', { name: 'X' })).rejects.toMatchObject({
      status: 404,
      code: 'CATEGORY_NOT_FOUND',
    });
  });
});
