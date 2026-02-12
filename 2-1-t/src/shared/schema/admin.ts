import { z } from 'zod';

import { idSchema } from './api';

export const adminReviewDecisionSchema = z.object({
  decision: z.enum(['published', 'rejected']),
  reason: z.string().optional(),
});

export const adminUpsertTaxonomySchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const adminUpdateUserSchema = z.object({
  id: idSchema,
  role: z.enum(['student', 'instructor', 'admin']).optional(),
  isActive: z.boolean().optional(),
});
