import { z } from 'zod';

export const idSchema = z.string().min(1);

export const purchaseRequestSchema = z.object({
  courseId: idSchema,
});

export const markLessonProgressRequestSchema = z.object({
  isCompleted: z.boolean(),
});
