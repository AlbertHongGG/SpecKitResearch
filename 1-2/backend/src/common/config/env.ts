import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().optional(),

    DATABASE_URL: z.string().min(1),
    TZ: z.string().default('Asia/Taipei'),

    APP_ORIGIN: z.string().url(),
    COOKIE_SECURE: z
        .string()
        .optional()
        .transform((v) => (v ?? 'false').toLowerCase() === 'true'),

    JWT_ACCESS_SECRET: z.string().min(8),
    JWT_REFRESH_SECRET: z.string().min(8),

    UPLOAD_DIR: z.string().default('./uploads'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        // eslint-disable-next-line no-console
        console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
        throw new Error('Invalid environment variables');
    }

    cachedEnv = parsed.data;
    return cachedEnv;
}
