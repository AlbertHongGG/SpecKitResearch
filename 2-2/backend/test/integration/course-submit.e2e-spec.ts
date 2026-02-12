import { describe, it, expect } from 'vitest';
import { CourseSubmitController } from '../../src/modules/instructor/course-submit.controller.js';

const prisma = {
  course: {
    findUnique: async () => ({ id: 'c1', instructorId: 'i1', status: 'draft' }),
    update: async ({ data }: any) => ({ id: 'c1', status: data.status }),
  },
} as any;

describe('CourseSubmitController', () => {
  it('submits draft course', async () => {
    const controller = new CourseSubmitController(prisma);
    const req = { user: { id: 'i1' } } as any;
    const result = await controller.submit('c1', req);
    expect(result.status).toBe('submitted');
  });
});
