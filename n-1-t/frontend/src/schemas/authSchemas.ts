import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 碼'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, '請輸入姓名'),
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 碼'),
});

export type RegisterValues = z.infer<typeof registerSchema>;
