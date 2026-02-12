import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http/http-exception.filter';
import { RequestIdMiddleware } from './shared/http/request-id.middleware';
import { loadEnv } from './shared/config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { logger: false });

  if (env.TRUST_PROXY) {
    // Enables secure cookies / correct IP handling behind reverse proxies.
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  await app.listen(3001);
}

bootstrap();
