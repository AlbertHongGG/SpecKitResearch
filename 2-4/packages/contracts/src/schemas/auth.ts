import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  return_to: z.string().optional(),
});

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
  return_to: z.string().optional(),
});

export const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
    })
    .nullable()
    .optional(),
  csrf_token: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
