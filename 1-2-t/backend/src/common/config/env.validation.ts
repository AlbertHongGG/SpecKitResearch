import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');
const corsOrigins = z
  .string()
  .default('http://localhost:5173,http://localhost:5174')
  .transform((value) => value.split(',').map((v) => v.trim()).filter(Boolean))
  .pipe(z.array(z.url()).nonempty());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGIN: corsOrigins,
  PORT: z.coerce.number().int().positive().default(4000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));

    console.error('Invalid environment variables', issues);
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}
