import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/http/http-exception.filter';
import { OriginCheckMiddleware } from '../src/shared/http/origin-check.middleware';
import { RequestIdMiddleware } from '../src/shared/http/request-id.middleware';

export async function createTestApp(): Promise<INestApplication> {
  process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&socket_timeout=30';
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.use(new OriginCheckMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: true, credentials: true });
  await app.init();
  return app;
}
