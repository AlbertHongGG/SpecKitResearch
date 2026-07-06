import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

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
    logger: ['error', 'warn', 'log'],
    forceCloseConnections: true,
  });

  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);
  const corsOriginsRaw = String(
    configService.get('CORS_ORIGINS') ??
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174',
  );
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
  });

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

  const port = Number(configService.get('PORT') ?? 4000);

  await app.listen(port);
}

void bootstrap();
