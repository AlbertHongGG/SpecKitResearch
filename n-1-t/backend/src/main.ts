import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { env } from './config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestTimingInterceptor } from './common/logging/request-timing.interceptor';
import { AppModule } from './app.module';

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
  const app = await NestFactory.create(AppModule, { 
    logger: ['log', 'error', 'warn'],
    forceCloseConnections: true,
  });

  app.enableCors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  });

  app.use(cookieParser());
  app.use(
    pinoHttp({
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestTimingInterceptor());

  app.enableShutdownHooks();

  if (coverageRuntimeEnabled) {
    const server = app.getHttpAdapter().getInstance();

    server.post('/__coverage/shutdown', async (req: { ip?: string }, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
      if (!isLocalAddress(req.ip)) {
        return res.status(403).json({ status: 'forbidden' });
      }

      res.status(202).json({ status: 'accepted', mode: 'runtime', saved: false });

      setImmediate(async () => {
        await takeCoverageSnapshot();
        await app.close();
        process.exit(0);
      });
    });
  }

  await app.listen(env.PORT);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
