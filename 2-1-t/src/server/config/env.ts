import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  SESSION_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Content Course Platform'),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
