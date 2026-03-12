import { z } from 'zod';

export const zUuid = z.string().uuid();

export const zErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof zErrorResponse>;
