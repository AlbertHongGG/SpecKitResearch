import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '密碼不一致',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
