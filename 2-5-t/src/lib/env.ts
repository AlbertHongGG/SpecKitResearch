import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
