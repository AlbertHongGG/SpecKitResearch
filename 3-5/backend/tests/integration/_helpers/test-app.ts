import 'reflect-metadata';

import fastifyCookie from '@fastify/cookie';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from '../../../src/app.module';
import { getEnv } from '../../../src/shared/config/env';
import { HttpExceptionFilter } from '../../../src/shared/errors/http-exception.filter';
import { UsageLogQueue } from '../../../src/shared/logging/usage-log.queue';
import { registerUsageLogHook } from '../../../src/shared/logging/usage-log.hook';
import { ensureRequestId } from '../../../src/shared/observability/request-id.middleware';
import { registerSecurityHeaders } from '../../../src/shared/security/security-headers.middleware';
import { ZodValidationPipe } from '../../../src/shared/validation/zod-validation.pipe';

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false })
  );

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie as any);

  // Mirror production behavior where possible.
  registerSecurityHeaders(fastify, getEnv());

  fastify.addHook('onRequest', async (request: any, reply: any) => {
    ensureRequestId(request, reply);
    (request as any).startTime = Date.now();
  });

  registerUsageLogHook(fastify, app.get(UsageLogQueue));

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  await fastify.ready();
  return app;
}

export async function injectJson(
  app: NestFastifyApplication,
  opts: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
): Promise<{ statusCode: number; headers: Record<string, string | string[]>; json: any; rawBody: string }> {
  const fastify: any = app.getHttpAdapter().getInstance();
  const res: any = await fastify.inject({
    method: opts.method,
    url: opts.url,
    payload: opts.body ? JSON.stringify(opts.body) : undefined,
    headers: {
      ...(opts.headers ?? {}),
      ...(opts.body ? { 'content-type': 'application/json' } : {})
    }
  });

  const contentType = (res.headers?.['content-type'] ?? '') as string;
  const rawBody = String(res.body ?? '');
  const json = contentType.includes('application/json') && rawBody ? JSON.parse(rawBody) : null;

  return {
    statusCode: res.statusCode,
    headers: res.headers as any,
    json,
    rawBody
  };
}

export function getSetCookieHeader(headers: Record<string, string | string[]>): string[] {
  const value = headers['set-cookie'];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function buildCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
}
