import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().optional(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),

  // bearer-only today, but keep optional refresh fields for future hardening
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_TTL: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`)
  }

  cachedEnv = parsed.data
  return cachedEnv
}
