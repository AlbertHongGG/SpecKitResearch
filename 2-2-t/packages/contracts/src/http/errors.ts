import { z } from 'zod';
import { ErrorCodes } from './error-codes';

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const FieldErrorResponseSchema = ErrorResponseSchema.extend({
  error: ErrorResponseSchema.shape.error.extend({
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export type FieldErrorResponse = z.infer<typeof FieldErrorResponseSchema>;

export function makeError(code: string, message: string, details?: Record<string, unknown>): ErrorResponse {
  return { error: { code, message, details } };
}

export function makeFieldError(
  code: string,
  message: string,
  fieldErrors: Record<string, string[]>,
  details?: Record<string, unknown>,
): FieldErrorResponse {
  return { error: { code, message, fieldErrors, details } };
}

export const CommonErrorMessages = {
  unauthorized: '請先登入',
  forbidden: '你沒有權限執行此操作',
  notFound: '資源不存在或不可見',
  internal: '系統發生錯誤，請稍後再試',
} as const;

export { ErrorCodes };
