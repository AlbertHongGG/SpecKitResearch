import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
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

  const port = Number(configService.get('PORT') ?? 4000);

  await app.listen(port);
}

void bootstrap();
