import { describe, it, expect } from 'vitest';
import { ReviewController } from '../../src/modules/admin/review.controller.js';

const prisma = {
  course: {
    findUnique: async () => ({ id: 'c1', status: 'submitted', publishedAt: null }),
    update: async ({ data }: any) => ({ id: 'c1', status: data.status }),
  },
  courseReview: {
    create: async () => ({ id: 'r1' }),
  },
} as any;

describe('ReviewController', () => {
  it('publishes submitted course', async () => {
    const controller = new ReviewController(prisma);
    const req = { user: { id: 'a1' } } as any;
    const result = await controller.review('c1', { decision: 'published', note: 'ok' }, req);
    expect(result.status).toBe('published');
  });
});
