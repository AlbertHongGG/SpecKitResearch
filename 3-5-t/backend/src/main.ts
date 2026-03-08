import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyReplyFrom from '@fastify/reply-from';

import { AppModule } from './app.module';
import { getConfig } from './common/config/config';
import { createLogger } from './common/logging/logger';
import { registerRequestIdHook } from './common/http/request-id.middleware';
import { HttpExceptionFilter } from './common/http/http-exception.filter';

async function bootstrap() {
  const config = getConfig(process.env);
  const logger = createLogger(config);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger }),
    { bufferLogs: true },
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  registerRequestIdHook(app);

  await app.register(fastifyCors as any, {
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Allow non-browser/cURL requests.
      if (!origin) return cb(null, true);

      // In production we expect a reverse proxy / same-origin; do not allow arbitrary cross-origin.
      if (config.nodeEnv === 'production') return cb(null, false);

      try {
        const url = new URL(origin);
        const host = url.hostname;

        if (host === 'localhost' || host === '127.0.0.1') return cb(null, true);

        // Allow private network IPs for local development.
        const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (m) {
          const [a, b] = [Number(m[1]), Number(m[2])];
          const isPrivate =
            a === 10 ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168);
          if (isPrivate) return cb(null, true);
        }

        return cb(null, false);
      } catch {
        return cb(null, false);
      }
    },
  });

  await app.register(fastifyCookie as any, {
    parseOptions: {
      sameSite: 'lax',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      path: '/',
    },
  });

  await app.register(fastifyReplyFrom as any, {
    // reply.from is used by gateway proxy
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, 'backend listening');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
