import { z } from 'zod';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF_FAILED: 'CSRF_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const ErrorCodeSchema = z.enum([
  ErrorCode.BAD_REQUEST,
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.UNAUTHORIZED,
  ErrorCode.FORBIDDEN,
  ErrorCode.NOT_FOUND,
  ErrorCode.CONFLICT,
  ErrorCode.RATE_LIMITED,
  ErrorCode.CSRF_FAILED,
  ErrorCode.INTERNAL_ERROR,
]);

export const FieldErrorsSchema = z.record(z.string(), z.array(z.string())).optional();

export const ErrorObjectSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  fieldErrors: FieldErrorsSchema,
  details: z.unknown().optional(),
});

export type ErrorObject = z.infer<typeof ErrorObjectSchema>;

export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: ErrorObjectSchema,
  requestId: z.string().min(1),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export function okEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    ok: z.literal(true),
    data,
    requestId: z.string().min(1),
  });
}

export type OkEnvelope<T> = {
  ok: true;
  data: T;
  requestId: string;
};
