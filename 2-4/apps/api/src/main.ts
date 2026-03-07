import 'reflect-metadata';
import './types/express-session';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Payload limits: protect endpoints like POST /responses.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  const allowedOrigins = new Set<string>([
    'http://localhost:5173',
    'http://localhost:5174',
  ]);

  const appBaseUrl = process.env.APP_BASE_URL;
  if (typeof appBaseUrl === 'string' && appBaseUrl.trim()) {
    allowedOrigins.add(appBaseUrl.trim());
  }

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(Number.isFinite(port) ? port : 3000);
}

bootstrap();

