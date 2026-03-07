import { z } from 'zod';

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
