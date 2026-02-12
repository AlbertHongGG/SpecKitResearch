import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  returnTo: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  returnTo: z.string().optional(),
});

export const threadDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20_000).optional(),
});

export const postSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type ThreadDraftForm = z.infer<typeof threadDraftSchema>;
export type PostForm = z.infer<typeof postSchema>;
