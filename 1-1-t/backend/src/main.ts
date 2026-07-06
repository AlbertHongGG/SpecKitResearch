import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { getEnv } from './common/config/env';
import { ErrorCodes } from './common/errors/error-codes';
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
  const env = getEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    forceCloseConnections: true,
  });

  app.useLogger(app.get(Logger));

  const corsOrigins = env.FRONTEND_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length <= 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
          details: { errors },
        }),
    }),
  );

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
bootstrap();
