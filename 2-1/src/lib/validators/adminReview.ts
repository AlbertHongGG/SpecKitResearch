import { z } from 'zod';

export const adminReviewDecisionBodySchema = z
  .object({
    decision: z.enum(['published', 'rejected']),
    reason: z.string().min(1).max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === 'rejected' && (!v.reason || !v.reason.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '駁回理由必填',
        path: ['reason'],
      });
    }
  });
