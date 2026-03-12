import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { getEnv } from './shared/config/env';
import { HttpExceptionFilter } from './shared/errors/http-exception.filter';
import { registerUsageLogHook } from './shared/logging/usage-log.hook';
import { startLogRetentionJob } from './shared/logging/log-retention.job';
import { PrismaService } from './shared/db/prisma.service';
import { startRateLimitCleanupJob } from './shared/rate-limit/rate-limit-cleanup.job';
import { MetricsService, registerMetricsHook } from './shared/observability/metrics';
import { UsageLogQueue } from './shared/logging/usage-log.queue';
import { ensureRequestId } from './shared/observability/request-id.middleware';
import { registerSecurityHeaders } from './shared/security/security-headers.middleware';
import { ZodValidationPipe } from './shared/validation/zod-validation.pipe';

const allowedCorsOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174'
]);

async function bootstrap() {
  const env = getEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCors as any, {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await fastify.register(fastifyCookie as any);

  registerSecurityHeaders(fastify, env);

  registerUsageLogHook(fastify, app.get(UsageLogQueue));

  const metrics = new MetricsService();
  registerMetricsHook(fastify, metrics);

  fastify.addHook('onRequest', async (request: any, reply: any) => {
    ensureRequestId(request, reply);
    (request as any).startTime = Date.now();
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  if (env.NODE_ENV !== 'test') {
    const prisma = app.get(PrismaService);
    startLogRetentionJob(prisma, { days: 90 });
    startRateLimitCleanupJob(prisma);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

bootstrap();
