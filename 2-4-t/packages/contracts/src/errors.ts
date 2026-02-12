import { z } from 'zod';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL: 'INTERNAL'
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorItemSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.array(z.union([z.string(), z.number()])).optional()
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.nativeEnum(ErrorCode as unknown as Record<string, string>),
    message: z.string(),
    request_id: z.string().optional(),
    details: z.array(ErrorItemSchema).optional()
  })
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
