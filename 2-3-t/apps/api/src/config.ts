import { z } from 'zod';

const zEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5174'),
  WEB_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().default('file:../../data/app.db'),
  COOKIE_SECRET: z.string().min(16),
});

export type AppConfig = z.infer<typeof zEnv>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return zEnv.parse(env);
}
