import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default('ap_session'),
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
  SESSION_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  API_KEY_HMAC_SECRET: z.string().min(16).default('dev-only-change-me-please'),
  PASSWORD_HASH_PEPPER: z.string().min(16).default('dev-only-change-me-please')
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(overrides?: Partial<Record<string, string | undefined>>): Env {
  const merged = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse(merged);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}
