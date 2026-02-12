import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/errors/http-exception.filter';
import { requestIdMiddleware } from '../../src/common/request/request-id.middleware';

type SupertestServer = Parameters<typeof request>[0];

const LoginResponseSchema = z
  .object({
    token: z.string(),
    refresh_token: z.string(),
    user: z
      .object({ id: z.string(), email: z.string(), role: z.string() })
      .passthrough(),
  })
  .passthrough();

const ApiUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
    is_active: z.boolean(),
  })
  .passthrough();

const UpdateUserResponseSchema = z
  .object({ user: ApiUserSchema })
  .passthrough();

describe('US3 user disable', () => {
  let app: INestApplication;
  let server: SupertestServer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us3-user-disable-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
    const dbPath = path.join(backendRoot, 'prisma', dbName);

    process.env.DATABASE_URL = `file:./prisma/${dbName}`;
    process.env.PRISMA_HIDE_UPDATE_MESSAGE = '1';

    if (existsSync(dbPath)) rmSync(dbPath);

    execSync('npx prisma migrate deploy', {
      cwd: backendRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });

    execSync('npx ts-node prisma/seed.ts', {
      cwd: backendRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });

    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(requestIdMiddleware);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    server = app.getHttpServer() as unknown as SupertestServer;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  it('disabling a user revokes refresh sessions and bumps tokenVersion', async () => {
    const agentBefore = await prisma.user.findUnique({
      where: { email: 'agent@example.com' },
    });
    expect(agentBefore).toBeTruthy();

    const adminLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123' })
      .expect(200);
    const adminLogin = LoginResponseSchema.parse(adminLoginRes.body);

    const agentLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'agent@example.com', password: 'AgentPass123' })
      .expect(200);
    const agentLogin = LoginResponseSchema.parse(agentLoginRes.body);

    const agentSessionsBefore = await prisma.authSession.findMany({
      where: { userId: agentLogin.user.id },
    });
    expect(agentSessionsBefore.length).toBeGreaterThan(0);
    expect(agentSessionsBefore.some((s) => s.revokedAt !== null)).toBe(false);

    const disableRes = await request(server)
      .patch(`/admin/users/${agentLogin.user.id}`)
      .set('Authorization', `Bearer ${adminLogin.token}`)
      .send({ is_active: false })
      .expect(200);

    const disabled = UpdateUserResponseSchema.parse(disableRes.body);
    expect(disabled.user.is_active).toBe(false);

    const agentAfterDisable = await prisma.user.findUnique({
      where: { id: agentLogin.user.id },
    });
    expect(agentAfterDisable).toBeTruthy();
    expect(agentAfterDisable?.isActive).toBe(false);
    expect(agentAfterDisable?.tokenVersion).toBe(
      (agentBefore?.tokenVersion ?? 0) + 1,
    );

    const agentSessionsAfter = await prisma.authSession.findMany({
      where: { userId: agentLogin.user.id },
    });
    expect(agentSessionsAfter.length).toBeGreaterThan(0);
    expect(agentSessionsAfter.every((s) => s.revokedAt !== null)).toBe(true);

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: agentLogin.refresh_token })
      .expect(401);

    // Re-enable the user to verify tokenVersion bump invalidates old access tokens.
    await request(server)
      .patch(`/admin/users/${agentLogin.user.id}`)
      .set('Authorization', `Bearer ${adminLogin.token}`)
      .send({ is_active: true })
      .expect(200);

    await request(server)
      .get('/agent/tickets?view=mine')
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .expect(401);
  });
});
