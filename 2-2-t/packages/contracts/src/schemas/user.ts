import { z } from 'zod';

export const UserRoleSchema = z.enum(['student', 'instructor', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  isActive: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionInfoSchema = z.object({
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime().optional(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
