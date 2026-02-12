import { z } from 'zod';

import { TransactionTypeValues, type TransactionType } from '../types';

export const TransactionCreateSchema = z.object({
  type: z.enum(TransactionTypeValues) satisfies z.ZodType<TransactionType>,
  amount: z.number().int().min(1),
  categoryId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v)),
  note: z.string().max(200).optional(),
});

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
