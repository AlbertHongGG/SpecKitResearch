import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';
import { RequestIdMiddleware } from './middleware/request-id.middleware.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableCors({
    origin: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use(cookieParser());
  app.use(RequestIdMiddleware);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(3001);
}

bootstrap();
