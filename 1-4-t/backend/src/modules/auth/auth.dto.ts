import { z } from 'zod'

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirm: z.string().min(8),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.password_confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['password_confirm'],
      })
    }
  })

export type RegisterDto = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginDto = z.infer<typeof loginSchema>
