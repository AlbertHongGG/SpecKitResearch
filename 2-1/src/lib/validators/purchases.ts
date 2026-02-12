import { z } from 'zod';

export const purchaseParamsSchema = z.object({
  courseId: z.string().min(1),
});
