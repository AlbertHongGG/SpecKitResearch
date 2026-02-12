import { describe, it, expect } from 'vitest';
import { ProgressController } from '../../src/modules/progress/progress.controller.js';

const prisma = {
  lesson: {
    findUnique: async () => ({ id: 'l1', section: { courseId: 'c1' } }),
  },
  course: { findUnique: async () => ({ id: 'c1', instructorId: 'i1' }) },
  purchase: { findUnique: async () => ({ id: 'p1' }) },
  lessonProgress: {
    upsert: async ({ create }: any) => ({ lessonId: create.lessonId, isCompleted: true, completedAt: new Date() }),
  },
} as any;

describe('ProgressController', () => {
  it('marks lesson completed', async () => {
    const controller = new ProgressController(prisma);
    const req = { user: { id: 'u1', role: 'student' } } as any;
    const result = await controller.updateProgress('c1', 'l1', { isCompleted: true }, req);
    expect(result.isCompleted).toBe(true);
  });
});
