import { z } from 'zod';

export const refundRequestSchema = z.object({
  subOrderId: z.string().min(1),
  reason: z.string().min(1).max(500),
  requestedCents: z.number().int().positive(),
});

export type RefundRequestBody = z.infer<typeof refundRequestSchema>;
