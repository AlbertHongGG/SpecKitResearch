import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  APP_ORIGIN: z.string().default("http://localhost:5174"),
  APP_ORIGINS: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);

export function getAllowedOrigins() {
  const configured = env.APP_ORIGINS
    ? env.APP_ORIGINS.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([env.APP_ORIGIN, ...configured]));
}
