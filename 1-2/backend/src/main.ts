import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getEnv } from './common/config/env';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createHttpLogger } from './common/logging/logger';

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: env.APP_ORIGIN,
    credentials: true,
  });

  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(createHttpLogger());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(env.PORT ?? 3000);
}
bootstrap();
