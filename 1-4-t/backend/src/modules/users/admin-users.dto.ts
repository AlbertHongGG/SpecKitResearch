import { z } from 'zod'

export const adminUsersQuerySchema = z.object({
  role: z.enum(['Customer', 'Agent', 'Admin']).optional(),
  is_active: z.coerce.boolean().optional(),
})

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Agent', 'Admin']),
})

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
})

export const updateAdminUserSchema = z.object({
  is_active: z.boolean().nullable().optional(),
  role: z.enum(['Customer', 'Agent', 'Admin']).nullable().optional(),
})

export type AdminUsersQueryDto = z.infer<typeof adminUsersQuerySchema>
export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>
export type UpdateAdminUserDto = z.infer<typeof updateAdminUserSchema>
