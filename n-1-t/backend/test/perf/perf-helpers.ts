import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { PrismaClient, UserRole, ActivityStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

export type PerfUser = { id: string; email: string; cookie: string };

export type PerfSetupResult = {
  app: INestApplication;
  prisma: PrismaService;
  activityId: string;
  activityCapacity: number;
  members: PerfUser[];
};

function ensurePerfEnv() {
  process.env.NODE_ENV ??= 'test';
  process.env.APP_TIMEZONE ??= 'UTC';
  process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
  // `src/config/env.ts` requires min length 16.
  process.env.JWT_SECRET ??= 'test-secret-test-secret';
}

async function ensureDatabaseInitialized(params: { prismaDir: string; dbFilename: string }): Promise<void> {
  const testDbPath = path.join(params.prismaDir, params.dbFilename);
  try {
    await fs.stat(testDbPath);
    return;
  } catch {
    // Continue.
  }

  await fs.copyFile(path.join(params.prismaDir, 'dev.db'), testDbPath);
}

function authCookieFor(userId: string, role: UserRole): string {
  const token = jwt.sign({ sub: userId, role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
  return `access_token=${token}`;
}

async function resetDatabase(prisma: PrismaClient) {
  await prisma.auditLog.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.user.deleteMany({});
}

export async function setupPerfApp(params: {
  memberCount: number;
  activityCapacity: number;
  dbFilename?: string;
}): Promise<PerfSetupResult> {
  ensurePerfEnv();

  const backendRoot = process.cwd();
  const prismaDir = path.join(backendRoot, 'prisma');
  const dbFilename =
    params.dbFilename ?? process.env.PERF_DB_FILENAME ?? `perf-${process.pid}-${Date.now()}.db`;

  // Prisma resolves SQLite relative paths against the schema directory (./prisma).
  process.env.DATABASE_URL = `file:./${dbFilename}?connection_limit=1`;
  await ensureDatabaseInitialized({ prismaDir, dbFilename });

  // Import after env vars are present, because config/env parses eagerly.
  const { AppModule } = await import('../../src/app.module');

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

  await resetDatabase(prisma);

  const passwordHash = 'perf-not-used';
  const adminId = randomUUID();
  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin-perf@example.com',
      name: 'Admin Perf',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const membersData = Array.from({ length: params.memberCount }, (_, i) => {
    const id = randomUUID();
    return {
      id,
      email: `member-${i + 1}@example.com`,
      name: `Member ${i + 1}`,
      passwordHash,
      role: UserRole.MEMBER,
    };
  });

  await prisma.user.createMany({ data: membersData });

  const members: PerfUser[] = membersData.map((m) => ({
    id: m.id,
    email: m.email,
    cookie: authCookieFor(m.id, UserRole.MEMBER),
  }));

  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const date = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const activity = await prisma.activity.create({
    data: {
      title: `Perf Activity (${params.memberCount} attempts)`,
      description: 'Perf test activity',
      date,
      deadline,
      location: 'Perf',
      capacity: params.activityCapacity,
      status: ActivityStatus.PUBLISHED,
      registeredCount: 0,
      createdByUserId: adminId,
    },
  });

  return {
    app,
    prisma,
    activityId: activity.id,
    activityCapacity: params.activityCapacity,
    members,
  };
}
