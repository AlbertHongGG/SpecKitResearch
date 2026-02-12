import { describe, it, expect } from 'vitest';
import { PurchaseService } from '../../src/modules/purchases/purchase.service.js';

const prisma = {
  course: {
    findUnique: async ({ where: { id } }: any) => ({ id, instructorId: 'i1', status: 'published' }),
  },
  purchase: {
    findUnique: async () => null,
    create: async ({ data }: any) => ({ id: 'p1', ...data }),
  },
} as any;

describe('PurchaseService', () => {
  it('creates a purchase for published course', async () => {
    const service = new PurchaseService(prisma);
    const result = await service.purchaseCourse('u1', 'c1', 'student');
    expect(result.courseId).toBe('c1');
  });
});
