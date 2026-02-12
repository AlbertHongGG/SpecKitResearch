import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/errors/http-exception.filter';
import { requestIdMiddleware } from '../../src/common/request/request-id.middleware';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

type SupertestServer = Parameters<typeof request>[0];

const LoginResponseSchema = z
  .object({
    token: z.string(),
    refresh_token: z.string(),
    user: z
      .object({ id: z.string(), role: z.string(), email: z.string() })
      .passthrough(),
  })
  .passthrough();

const CreateTicketResponseSchema = z
  .object({
    ticket: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();

const TicketDetailSchema = z
  .object({
    ticket: z
      .object({
        id: z.string(),
        status: z.string(),
        assignee_id: z.string().nullable(),
      })
      .passthrough(),
  })
  .passthrough();

describe('US2 agent concurrency', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us2-concurrency-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

    const prisma = new PrismaClient();
    const passwordHash = await bcrypt.hash('Agent2Pass123', 12);
    await prisma.user.create({
      data: {
        email: 'agent2@example.com',
        passwordHash,
        role: UserRole.AGENT,
        isActive: true,
      },
    });
    await prisma.$disconnect();

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
  });

  it('two agents race to take a ticket: exactly one succeeds, the other gets 409', async () => {
    const adminLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123' })
      .expect(200);
    const adminLogin = LoginResponseSchema.parse(adminLoginRes.body);

    const customerLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'customer@example.com', password: 'CustomerPass123' })
      .expect(200);
    const customerLogin = LoginResponseSchema.parse(customerLoginRes.body);

    const agent1LoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'agent@example.com', password: 'AgentPass123' })
      .expect(200);
    const agent1Login = LoginResponseSchema.parse(agent1LoginRes.body);

    const agent2LoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'agent2@example.com', password: 'Agent2Pass123' })
      .expect(200);
    const agent2Login = LoginResponseSchema.parse(agent2LoginRes.body);

    const createTicketRes = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        title: `Race ticket ${Date.now()}`,
        category: 'Other',
        description: 'Please help',
      })
      .expect(201);

    const created = CreateTicketResponseSchema.parse(createTicketRes.body);
    const ticketId = created.ticket.id;

    const [take1, take2] = await Promise.all([
      request(server)
        .post(`/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${agent1Login.token}`)
        .send({ assignee_id: agent1Login.user.id, expected_status: 'Open' }),
      request(server)
        .post(`/tickets/${ticketId}/assignee`)
        .set('Authorization', `Bearer ${agent2Login.token}`)
        .send({ assignee_id: agent2Login.user.id, expected_status: 'Open' }),
    ]);

    const statuses = [take1.status, take2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const detailRes = await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminLogin.token}`)
      .expect(200);

    const detail = TicketDetailSchema.parse(detailRes.body);
    expect(detail.ticket.status).toBe('In Progress');
    expect([agent1Login.user.id, agent2Login.user.id]).toContain(
      detail.ticket.assignee_id,
    );
  });
});
