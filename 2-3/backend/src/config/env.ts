import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return value;
}, z.boolean());

const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3001),

    AUTH_JWT_SECRET: z.string().min(16),
    AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(14),

    COOKIE_SECURE: booleanFromString.default(false),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
