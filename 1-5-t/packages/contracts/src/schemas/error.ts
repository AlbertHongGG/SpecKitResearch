import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
  'ValidationError',
  'Unauthorized',
  'Forbidden',
  'NotFound',
  'Conflict',
  'InternalError',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().min(1),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
