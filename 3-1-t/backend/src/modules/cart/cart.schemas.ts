import { z } from 'zod';

export const cartItemBodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const cartItemUpdateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const cartItemDeleteSchema = z.object({
  itemId: z.string().min(1),
});

export type CartItemBody = z.infer<typeof cartItemBodySchema>;
export type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>;
export type CartItemDelete = z.infer<typeof cartItemDeleteSchema>;
