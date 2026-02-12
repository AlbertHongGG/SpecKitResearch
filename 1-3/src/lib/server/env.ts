import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_COOKIE_NAME: z.string().min(1).default('auth_session'),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME ?? 'auth_session',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
});
