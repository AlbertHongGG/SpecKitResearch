import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  COOKIE_SIGNING_SECRET: z.string().min(16).default('dev_cookie_signing_secret_please_change'),
  SESSION_COOKIE_NAME: z.string().default('pfs_session'),
  SESSION_TTL_SEC: z.coerce.number().int().positive().default(8 * 60 * 60),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: Record<string, unknown>): Env {
  return EnvSchema.parse(raw);
}
