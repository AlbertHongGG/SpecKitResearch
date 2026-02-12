import { z } from 'zod';

export const courseIdParamsSchema = z.object({
  courseId: z.string().min(1),
});

export const listCoursesQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  q: z.string().min(1).max(200).optional(),
});
