import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default('sid'),
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1209600),
  PORT: z.coerce.number().int().positive().default(3001),
  UPLOADS_DIR: z.string().min(1).default('../var/uploads'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => EnvSchema.parse(env),
    }),
  ],
})
export class AppConfigModule {}
