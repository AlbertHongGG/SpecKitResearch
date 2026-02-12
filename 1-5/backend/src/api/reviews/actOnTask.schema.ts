import { z } from 'zod';

export const ActOnTaskSchema = z
  .object({
    action: z.enum(['Approve', 'Reject']),
    reason: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action === 'Reject' && (!val.reason || val.reason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Reject requires reason',
      });
    }
  });

export type ActOnTaskBody = z.infer<typeof ActOnTaskSchema>;
