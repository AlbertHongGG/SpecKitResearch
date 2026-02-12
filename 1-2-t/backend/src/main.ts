import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getEnv } from './common/config/env.validation';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { createHttpLogger } from './common/observability/logger';
import { requestIdMiddleware } from './common/observability/request-id.middleware';

async function bootstrap() {
  const env = getEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
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

  await app.listen(env.PORT);
}
bootstrap().catch((err: unknown) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
