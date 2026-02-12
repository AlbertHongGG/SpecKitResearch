import { describe, it, expect } from 'vitest';
import { TaxonomyController } from '../../src/modules/admin/taxonomy.controller.js';
import { UsersController } from '../../src/modules/admin/users.controller.js';

const prisma = {
  courseCategory: {
    findMany: async () => [{ id: 'c1', name: '分類' }],
    create: async ({ data }: any) => ({ id: 'c2', ...data }),
  },
  tag: {
    findMany: async () => [{ id: 't1', name: '標籤' }],
    create: async ({ data }: any) => ({ id: 't2', ...data }),
  },
  user: {
    findMany: async () => [{ id: 'u1', email: 'a@b.com', role: 'student', isActive: true }],
    update: async ({ data }: any) => ({ id: 'u1', ...data }),
  },
} as any;

describe('Admin controllers', () => {
  it('lists categories and tags', async () => {
    const taxonomy = new TaxonomyController(prisma);
    const categories = await taxonomy.listCategories();
    const tags = await taxonomy.listTags();
    expect(categories.items.length).toBe(1);
    expect(tags.items.length).toBe(1);
  });

  it('updates user', async () => {
    const users = new UsersController(prisma);
    const result = await users.update('u1', { role: 'admin' });
    expect(result.role).toBe('admin');
  });
});
