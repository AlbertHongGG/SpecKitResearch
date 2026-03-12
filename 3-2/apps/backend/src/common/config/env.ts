import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_SECRET: z.string().min(16),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  APP_ORIGINS: z.string().optional(),
});

export type EnvShape = {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  appOrigins: string[];
};

export class Env {
  static load(): EnvShape {
    const parsed = schema.parse(process.env);
    const appOrigins = (parsed.APP_ORIGINS ?? parsed.APP_ORIGIN)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return {
      port: parsed.PORT,
      databaseUrl: parsed.DATABASE_URL,
      sessionSecret: parsed.SESSION_SECRET,
      appOrigins,
    };
  }
}
