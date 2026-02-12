import { z } from 'zod';
import { RoleSchema, UuidSchema } from './common.js';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: z.object({
    id: UuidSchema,
    email: z.string().email(),
    role: RoleSchema,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = LoginResponseSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;
