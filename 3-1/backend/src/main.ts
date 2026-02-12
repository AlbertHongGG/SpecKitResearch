import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http/http-exception.filter';
import { OriginCheckMiddleware } from './shared/http/origin-check.middleware';
import { RequestIdMiddleware } from './shared/http/request-id.middleware';
import { SerializationInterceptor } from './shared/http/serialization.interceptor';
import { rateLimit } from './shared/security/rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.use(new OriginCheckMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new SerializationInterceptor());

  app.use(
    '/api/auth/login',
    rateLimit({ name: 'auth_login', windowMs: 60_000, max: 20 }),
  );
  app.use(
    '/api/payments/webhook',
    rateLimit({ name: 'payments_webhook', windowMs: 60_000, max: 60 }),
  );

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
