import { z } from 'zod';

export const adminUpdateUserBodySchema = z
  .object({
    role: z.enum(['student', 'instructor', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });
