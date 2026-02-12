import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});
