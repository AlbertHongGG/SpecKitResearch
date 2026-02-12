import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function createTestApp(): Promise<{
  app: INestApplication;
  http: ReturnType<typeof request>;
}> {
  const [{ AppModule }, { RequestIdMiddleware }, { HttpExceptionFilter }] = await Promise.all([
    import('../../dist/app.module'),
    import('../../dist/common/middleware/request-id.middleware'),
    import('../../dist/common/filters/http-exception.filter'),
  ]);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
  };
}

export function extractCookie(setCookieHeader: string | string[] | undefined) {
  const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!raw) return null;
  return raw.split(';')[0] || null;
}
