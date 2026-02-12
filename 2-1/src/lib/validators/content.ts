import { z } from 'zod';

export const myCourseParamsSchema = z.object({
  courseId: z.string().min(1),
});

export const readerQuerySchema = z.object({
  lessonId: z.string().min(1).optional(),
});

export const lessonProgressParamsSchema = z.object({
  lessonId: z.string().min(1),
});

export const setProgressBodySchema = z.object({
  isCompleted: z.boolean(),
});
