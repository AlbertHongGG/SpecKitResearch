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

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(Number.isFinite(port) ? port : 4000);
}

bootstrap();

