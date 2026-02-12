import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = app.get(ConfigService);

  const corsOrigin = String(config.get('CORS_ORIGIN') ?? 'http://localhost:3000');
  const origin = corsOrigin.includes(',') ? corsOrigin.split(',').map((s) => s.trim()).filter(Boolean) : corsOrigin;

  app.enableCors({
    origin,
    credentials: true,
  });

  const port = Number(config.get('PORT') ?? 3001);
  await app.listen(port);
}

bootstrap();
