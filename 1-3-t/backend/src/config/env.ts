import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('file:'), {
      message: 'DATABASE_URL must start with "file:" for SQLite (example: file:./prisma/dev.db)',
    }),
  SESSION_SECRET: z.string().min(16),
  APP_ORIGIN: z.string().url(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse(processEnv);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(flattened.fieldErrors)}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
