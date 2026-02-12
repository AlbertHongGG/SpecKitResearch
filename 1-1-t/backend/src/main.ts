import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { getEnv } from './common/config/env';
import { ErrorCodes } from './common/errors/error-codes';
import { HttpExceptionFilter } from './common/http/http-exception.filter';

async function bootstrap() {
  const env = getEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const corsOrigins = env.FRONTEND_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length <= 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
          details: { errors },
        }),
    }),
  );

  await app.listen(env.PORT);
}
bootstrap();
