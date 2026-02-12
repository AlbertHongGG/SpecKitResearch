import { z } from 'zod';

export const transactionTypeSchema = z.enum(['income', 'expense']);

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(),
  categoryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export const updateTransactionSchema = z.object({
  type: transactionTypeSchema.optional(),
  amount: z.number().int().positive().optional(),
  categoryId: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(200).optional(),
});
