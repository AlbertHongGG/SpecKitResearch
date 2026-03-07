import { z } from 'zod';

export const checkoutBodySchema = z.object({
  note: z.string().max(500).optional(),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
