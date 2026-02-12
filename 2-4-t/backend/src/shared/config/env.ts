import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_COOKIE_NAME: z.string().default('sid'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1209600),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.boolean().default(false)
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  return parsed.data;
}
