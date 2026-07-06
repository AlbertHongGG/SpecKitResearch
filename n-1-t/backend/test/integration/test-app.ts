import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ActivityStatus, PrismaClient, UserRole } from '@prisma/client';

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const initializedDbFiles = new Map<string, Promise<void>>();

export type SeededUsers = {
  admin: { id: string; email: string; password: string };
  member: { id: string; email: string; password: string };
};

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.NODE_ENV ??= 'test';
  process.env.APP_TIMEZONE ??= 'UTC';
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
  // Jest runs test files in parallel worker processes; a shared SQLite file leads to racey resets.
  const workerId = process.env.JEST_WORKER_ID ?? '0';
  const backendRoot = process.cwd();
  const prismaDir = path.join(backendRoot, 'prisma');
  const testDbFilename = `test-${process.pid}-${workerId}.db`;
  const testDbPath = path.join(prismaDir, testDbFilename);

  // Prisma resolves SQLite relative paths against the schema directory (./prisma).
  process.env.DATABASE_URL = `file:./${testDbFilename}`;
  await ensureTestDatabaseInitialized({ testDbPath, templateDbPath: path.join(prismaDir, 'dev.db') });

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.auditLog.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.user.deleteMany({});
}

async function ensureTestDatabaseInitialized(params: { testDbPath: string; templateDbPath: string }): Promise<void> {
  const existing = initializedDbFiles.get(params.testDbPath);
  if (existing) {
    await existing;
    return;
  }

  const init = (async () => {
    try {
      await fs.stat(params.testDbPath);
      return;
    } catch {
      // Continue.
    }

    await fs.copyFile(params.templateDbPath, params.testDbPath);
  })();

  initializedDbFiles.set(params.testDbPath, init);
  await init;
}

export async function seedDatabase(prisma: PrismaClient): Promise<SeededUsers> {
  const adminEmail = 'admin@example.com';
  const memberEmail = 'member@example.com';
  const adminPassword = 'password1234';
  const memberPassword = 'password1234';

  const adminPasswordHash = await bcrypt.hash(adminPassword, 4);
  const memberPasswordHash = await bcrypt.hash(memberPassword, 4);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin', role: UserRole.ADMIN, passwordHash: adminPasswordHash },
    create: { email: adminEmail, name: 'Admin', role: UserRole.ADMIN, passwordHash: adminPasswordHash },
  });

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: { name: 'Member', role: UserRole.MEMBER, passwordHash: memberPasswordHash },
    create: { email: memberEmail, name: 'Member', role: UserRole.MEMBER, passwordHash: memberPasswordHash },
  });

  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  await prisma.activity.create({
    data: {
      title: '公開活動 A',
      description: '活動 A 描述',
      date: inThreeDays,
      deadline: inTwoDays,
      location: '社辦',
      capacity: 2,
      status: ActivityStatus.PUBLISHED,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  await prisma.activity.create({
    data: {
      title: '公開活動 B（額滿）',
      description: '活動 B 描述',
      date: inFourDays,
      deadline: inTwoDays,
      location: '教室',
      capacity: 1,
      status: ActivityStatus.FULL,
      registeredCount: 1,
      createdByUserId: admin.id,
    },
  });

  await prisma.activity.create({
    data: {
      title: '草稿活動（不可見）',
      description: '草稿活動描述',
      date: inFourDays,
      deadline: inTwoDays,
      location: '會議室',
      capacity: 5,
      status: ActivityStatus.DRAFT,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  return {
    admin: { id: admin.id, email: adminEmail, password: adminPassword },
    member: { id: member.id, email: memberEmail, password: memberPassword },
  };
}
