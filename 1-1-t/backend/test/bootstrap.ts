import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../src/app.module';
import { ErrorCodes } from '../src/common/errors/error-codes';
import { HttpExceptionFilter } from '../src/common/http/http-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';

export type TestContext = {
  app: INestApplication;
  prisma: PrismaService;
};

export async function bootstrapTestApp(): Promise<TestContext> {
  process.env.NODE_ENV ??= 'test';
  process.env.DATABASE_URL ??= 'file:./test.db';
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.TZ ??= 'Asia/Taipei';
  process.env.FRONTEND_ORIGIN ??= 'http://127.0.0.1:5173';

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useLogger(app.get(Logger));

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

  await app.init();

  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

  return { app, prisma };
}

export async function clearDatabase(prisma: PrismaService) {
  await prisma.auditEvent.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();
}
