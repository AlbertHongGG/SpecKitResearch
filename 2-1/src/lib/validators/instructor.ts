import { z } from 'zod';

export const instructorCreateCourseBodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.number().int().min(0),
  coverFileId: z.string().min(1).nullable().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

export const instructorUpdateCourseBodySchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(5000).optional(),
    price: z.number().int().min(0).optional(),
    coverFileId: z.string().min(1).nullable().optional(),
    tagIds: z.array(z.string().min(1)).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });

export const instructorSetPublishStatusBodySchema = z.object({
  toStatus: z.enum(['published', 'archived']),
});
