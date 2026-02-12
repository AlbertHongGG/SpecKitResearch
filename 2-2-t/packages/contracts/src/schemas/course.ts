import { z } from 'zod';
import { UserSchema } from './user';

export const CourseStatusSchema = z.enum(['draft', 'submitted', 'published', 'rejected', 'archived']);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

export const CourseSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number().int().nonnegative(),
  status: CourseStatusSchema,
  coverImageUrl: z.string().nullable().optional(),
  category: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .optional(),
  tags: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .default([]),
  instructor: UserSchema.pick({ id: true, email: true }),
});
export type CourseSummary = z.infer<typeof CourseSummarySchema>;
