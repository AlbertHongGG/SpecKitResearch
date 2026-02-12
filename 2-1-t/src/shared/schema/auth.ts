import { z } from 'zod';

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'instructor']).default('student'),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['student', 'instructor', 'admin']),
  isActive: z.boolean(),
});

export const sessionInfoSchema = z.object({
  userId: z.string(),
  role: z.enum(['student', 'instructor', 'admin']),
  issuedAt: z.string(),
  expiresAt: z.string(),
});
