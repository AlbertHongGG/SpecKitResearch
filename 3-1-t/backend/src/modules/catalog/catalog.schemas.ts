import { z } from 'zod';

export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  sellerId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const productIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
