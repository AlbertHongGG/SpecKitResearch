import { z } from 'zod';
import { SessionInfoSchema, UserSchema } from './user';

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const AuthSessionResponseSchema = z.object({
  user: UserSchema,
  session: SessionInfoSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
