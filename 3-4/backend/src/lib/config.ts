import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_BASE_URL: z.string().url().default('http://localhost:5173'),

  SESSION_COOKIE_NAME: z.string().min(1).default('paysim_session'),
  CSRF_COOKIE_NAME: z.string().min(1).default('csrf_token'),
  SESSION_IDLE_SEC: z.coerce.number().int().positive().default(60 * 60 * 8),
  SESSION_ABSOLUTE_SEC: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),

  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('false'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  WEBHOOK_SIGNING_TOLERANCE_SEC: z.coerce.number().int().positive().default(300),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  WEBHOOK_WORKER_ID: z.string().default('worker-1'),

  SECRET_ENCRYPTION_KEY_BASE64: z
    .string()
    .min(1)
    .default('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='),

  RUN_WEBHOOK_WORKER: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('true'),

  RUN_CLEANUP_WORKER: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('true'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}
