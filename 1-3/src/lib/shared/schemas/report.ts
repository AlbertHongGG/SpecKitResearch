import { z } from 'zod';

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000),
  month: z.coerce.number().int().min(1).max(12),
});
