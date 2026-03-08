import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyReplyFrom from '@fastify/reply-from';

import { PrismaService } from '../../src/common/db/prisma.service';
import { HttpExceptionFilter } from '../../src/common/http/http-exception.filter';
import { registerRequestIdHook } from '../../src/common/http/request-id.middleware';
import { getConfig } from '../../src/common/config/config';

export async function createTestApp({ databaseUrl }: { databaseUrl: string }) {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  // Force override in tests (backend/.env may contain short dev pepper)
  process.env.API_KEY_PEPPER = 'test-pepper-0123456789';
  process.env.SESSION_COOKIE_NAME = 'sid';
  process.env.SESSION_TTL_DAYS = '30';
  process.env.PASSWORD_MIN_LENGTH = '12';
  process.env.UPSTREAM_ALLOWLIST_HOSTS = 'localhost,127.0.0.1';
  process.env.LOG_LEVEL = 'silent';
  process.env.USAGE_QUEUE_MAX = '1000';
  process.env.AUDIT_QUEUE_MAX = '1000';
  process.env.LOG_FLUSH_INTERVAL_MS = '50';

  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  const config = getConfig(process.env);
  app.useGlobalFilters(new HttpExceptionFilter());
  registerRequestIdHook(app);

  await app.register(fastifyCookie as any, {
    parseOptions: {
      sameSite: 'lax',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      path: '/',
    },
  });

  await app.register(fastifyReplyFrom as any);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const prisma = app.get(PrismaService);
  return {
    app: app as INestApplication,
    prisma,
    async close() {
      await app.close();
    },
  };
}
