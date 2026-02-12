import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { requestIdMiddleware } from './common/observability/request-id.middleware';
import { PrismaService } from './prisma/prisma.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(Number(process.env.PORT) || 3001);
}
bootstrap();
void bootstrap();
