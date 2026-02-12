import { z } from 'zod';

export const rejectFormSchema = z.object({
  reason: z.string().min(1, '請填寫駁回原因'),
});

export type RejectFormValues = z.infer<typeof rejectFormSchema>;
