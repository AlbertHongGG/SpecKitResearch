import { z } from 'zod';

export const CourseCreateRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().nonnegative(),
  coverImageUrl: z.string().url().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const CourseUpdateRequestSchema = CourseCreateRequestSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: '至少需要更新一個欄位',
});
