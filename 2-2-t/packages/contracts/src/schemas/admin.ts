import { z } from 'zod';

export const AdminReviewDecisionRequestSchema = z.object({
  decision: z.enum(['published', 'rejected']),
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
