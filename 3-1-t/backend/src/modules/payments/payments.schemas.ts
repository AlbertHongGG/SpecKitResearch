import { z } from 'zod';

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const paymentCallbackSchema = z.object({
  paymentId: z.string().min(1),
  orderId: z.string().min(1),
  transactionId: z.string().min(1),
  status: z.enum(['SUCCEEDED', 'FAILED', 'CANCELLED']),
});

export type PaymentCallbackBody = z.infer<typeof paymentCallbackSchema>;
