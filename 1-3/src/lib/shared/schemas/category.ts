import { z } from 'zod';

export const categoryTypeSchema = z.enum(['income', 'expense', 'both']);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(20),
  type: categoryTypeSchema,
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(20).optional(),
  type: categoryTypeSchema.optional(),
  isActive: z.boolean().optional(),
});
