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

const coverageRuntimeEnabled = process.env.COVERAGE_RUNTIME === '1';

function isLocalAddress(ip: string | undefined) {
  return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

async function takeCoverageSnapshot() {
  try {
    const v8 = await import('node:v8');
    v8.takeCoverage();
  } catch {
    // Ignore environments where V8 coverage is unavailable.
  }
}

async function bootstrap() {
  const config = getConfig(process.env);
  const logger = createLogger(config);
  const allowedDevOrigins = new Set(['http://localhost:5173', 'http://localhost:5174']);

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
        const originKey = `${url.protocol}//${url.host}`;

        if (allowedDevOrigins.has(originKey)) return cb(null, true);

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

  if (coverageRuntimeEnabled) {
    const server = app.getHttpAdapter().getInstance();

    server.post('/__coverage/shutdown', async (request: { ip?: string }, reply: { code: (statusCode: number) => { send: (body: unknown) => void } }) => {
      if (!isLocalAddress(request.ip)) {
        return reply.code(403).send({ status: 'forbidden' });
      }

      reply.code(202).send({ status: 'accepted', mode: 'runtime', saved: false });

      setImmediate(async () => {
        await takeCoverageSnapshot();
        await app.close();
        process.exit(0);
      });
    });
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, 'backend listening');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
