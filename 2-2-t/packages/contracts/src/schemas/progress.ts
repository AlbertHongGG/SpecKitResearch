import { z } from 'zod';

export const MarkCompleteRequestSchema = z.object({
  lessonId: z.string(),
});

export const MarkCompleteResponseSchema = z.object({
  lessonId: z.string(),
  isCompleted: z.boolean(),
  completedAt: z.string().datetime().nullable(),
});
