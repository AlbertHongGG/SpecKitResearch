import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { requestIdMiddleware } from './common/observability/request-id.middleware';
import { PrismaService } from './prisma/prisma.service';
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

function resolveCorsOrigins() {
  return (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { forceCloseConnections: true });

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

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

  await app.listen(Number(process.env.PORT) || 4000);
}
void bootstrap();
