import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_SECRET: z.string().min(16),
  APP_ORIGIN: z.string().default('http://localhost:3000'),
});

export type EnvShape = {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  appOrigin: string;
};

export class Env {
  static load(): EnvShape {
    const parsed = schema.parse(process.env);
    return {
      port: parsed.PORT,
      databaseUrl: parsed.DATABASE_URL,
      sessionSecret: parsed.SESSION_SECRET,
      appOrigin: parsed.APP_ORIGIN,
    };
  }
}
