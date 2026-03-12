import 'reflect-metadata';

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { buildSessionMiddleware } from '../../src/common/auth/session.config';
import { requestContextMiddleware } from '../../src/common/observability/request-context.middleware';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { seedBaseData, type SeedFixtures } from '../../prisma/seed';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  fixtures: SeedFixtures;
  databaseDirectory: string;
}

export async function createTestContext(): Promise<TestContext> {
  const databaseDirectory = mkdtempSync(join(tmpdir(), 'jira-lite-us1-'));
  const databaseUrl = `file:${join(databaseDirectory, 'test.db').replace(/\\/g, '/')}`;
  process.env.DATABASE_URL = databaseUrl;

  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], {
    cwd: 'C:/Users/JasonHong/Desktop/specKit/project/3-2-t/backend',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'ignore',
  });

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.use(buildSessionMiddleware());
  app.use(requestContextMiddleware);
  app.setGlobalPrefix('api');
  await app.init();

  const prisma = app.get(PrismaService);
  const fixtures = await seedBaseData(prisma);

  return {
    app,
    prisma,
    fixtures,
    databaseDirectory,
  };
}

export async function resetTestContext(context: TestContext): Promise<void> {
  context.fixtures = await seedBaseData(context.prisma);
}

export async function disposeTestContext(context: TestContext): Promise<void> {
  if (!context) {
    return;
  }

  await context.prisma.$disconnect();
  await context.app.close();
  rmSync(context.databaseDirectory, { recursive: true, force: true });
}

export function api(context: TestContext) {
  return request(context.app.getHttpServer());
}

export async function getCsrfToken(agent: { get: (path: string) => request.Test }): Promise<string> {
  const response = await agent.get('/api/session').expect(200);
  return String(response.body.csrfToken ?? '');
}

export async function loginAs(
  context: TestContext,
  credentials: { email: string; password: string },
) {
  const agent = request.agent(context.app.getHttpServer());
  await agent.post('/api/auth/login').send(credentials).expect(201);
  return agent;
}