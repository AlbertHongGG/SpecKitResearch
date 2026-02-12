import { z } from 'zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  return_to: z.string().optional()
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string()
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  user: UserSchema.nullable(),
  csrf_token: z.string().optional()
});
export type Session = z.infer<typeof SessionSchema>;

export const LoginResponseSchema = z.object({
  user: UserSchema,
  return_to: z.string().optional(),
  csrf_token: z.string().optional()
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
