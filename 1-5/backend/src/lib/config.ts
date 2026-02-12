import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),

    DATABASE_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),

    COOKIE_SECURE: boolFromEnv.default(false),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    CSRF_COOKIE_NAME: z.string().min(1).default('csrf_token'),
    CSRF_HEADER_NAME: z.string().min(1).default('x-csrf-token'),

    READ_ONLY_MODE: boolFromEnv.default(false),

    ATTACHMENTS_DIR: z.string().min(1).default('./storage/attachments'),
  })
  .passthrough();

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse(process.env);

export const isProd = config.NODE_ENV === 'production';
