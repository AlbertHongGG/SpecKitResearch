import { z } from 'zod';

export const adminCreateCategoryBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export const adminUpdateCategoryBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });

export const adminCreateTagBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export const adminUpdateTagBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });
