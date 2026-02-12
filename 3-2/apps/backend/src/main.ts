import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { Env } from './common/config/env.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { HttpErrorFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new HttpErrorFilter());

  const env = Env.load();
  app.enableCors({
    origin: env.appOrigin,
    credentials: true,
  });

  await app.listen(env.port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
