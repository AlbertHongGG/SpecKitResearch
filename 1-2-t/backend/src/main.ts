import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getEnv } from './common/config/env.validation';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { createHttpLogger } from './common/observability/logger';
import { requestIdMiddleware } from './common/observability/request-id.middleware';

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
  const env = getEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    forceCloseConnections: true,
  });

  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.use(createHttpLogger());

  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
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
bootstrap().catch((err: unknown) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
