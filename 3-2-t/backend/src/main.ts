import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { buildSessionMiddleware } from './common/auth/session.config';
import { requestContextMiddleware } from './common/observability/request-context.middleware';
import { AppLoggerService } from './common/observability/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);
  const configuredOrigins = [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const allowedOrigins = Array.from(
    new Set(['http://localhost:5173', 'http://localhost:5174', ...configuredOrigins]),
  );
  const port = Number(process.env.PORT ?? 4000);

  app.useLogger(logger);
  app.use(cookieParser());
  app.use(buildSessionMiddleware());
  app.use(requestContextMiddleware);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
