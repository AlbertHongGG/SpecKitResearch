import { z } from 'zod';
import type { ErrorCode } from '../errors';

export const ErrorSchema = z.object({
  code: z.string() as z.ZodType<ErrorCode>,
  message: z.string(),
  request_id: z.string(),
});

export const FieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ValidationErrorSchema = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  request_id: z.string(),
  errors: z.array(FieldErrorSchema),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorSchema>;
