import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http/http-exception.filter';
import { RequestIdMiddleware } from './shared/http/request-id.middleware';
import { loadEnv } from './shared/config/env';

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
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { logger: false, forceCloseConnections: true });

  if (env.TRUST_PROXY) {
    // Enables secure cookies / correct IP handling behind reverse proxies.
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
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

  await app.listen(env.PORT);
}

bootstrap();
