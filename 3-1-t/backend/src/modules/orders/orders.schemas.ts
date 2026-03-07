import { z } from 'zod';

export const orderIdParamSchema = z.object({ id: z.string().min(1) });
export const subOrderParamsSchema = z.object({
  id: z.string().min(1),
  subOrderId: z.string().min(1),
});
