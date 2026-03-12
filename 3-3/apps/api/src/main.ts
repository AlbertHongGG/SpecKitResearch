import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { PrismaService } from './modules/db/prisma.service';
import { makeAuthSessionMiddleware } from './middleware/auth-session.middleware';
import { csrfMiddleware } from './middleware/csrf.middleware';
import { originMiddleware } from './middleware/origin.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const defaultOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
  ]);
  for (const value of (process.env.APP_ORIGIN ?? '').split(',')) {
    const origin = value.trim();
    if (origin) defaultOrigins.add(origin);
  }
  const allowedOrigins = Array.from(defaultOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests that don't send Origin.
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'X-CSRF-Token',
      'X-Request-Id',
      'X-Organization-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(originMiddleware);
  app.use(csrfMiddleware);

  const prisma = app.get(PrismaService);
  app.use(makeAuthSessionMiddleware(prisma));

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port);
}
bootstrap();
