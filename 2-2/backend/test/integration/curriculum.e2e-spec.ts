import { describe, it, expect } from 'vitest';
import { CurriculumController } from '../../src/modules/curriculum/curriculum.controller.js';

const prisma = {
  course: {
    findUnique: async () => ({ id: 'c1', instructorId: 'i1', status: 'draft' }),
  },
  section: {
    create: async ({ data }: any) => ({ id: 's1', ...data }),
  },
  lesson: {
    create: async ({ data }: any) => ({ id: 'l1', ...data }),
  },
} as any;

describe('CurriculumController', () => {
  it('creates section and lesson', async () => {
    const controller = new CurriculumController(prisma);
    const req = { user: { id: 'i1' } } as any;
    const section = await controller.createSection('c1', { title: '章節', order: 1 }, req);
    const lesson = await controller.createLesson(
      'c1',
      's1',
      { title: '單元', order: 1, contentType: 'text', contentText: '內容' },
      req,
    );
    expect(section.id).toBe('s1');
    expect(lesson.id).toBe('l1');
  });
});
