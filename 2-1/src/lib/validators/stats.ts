import { z } from 'zod';

export const statsResponseSchema = z.object({
  userCount: z.number().int().nonnegative(),
  purchaseCount: z.number().int().nonnegative(),
  courseCountsByStatus: z.record(z.string(), z.number().int().nonnegative()),
});
