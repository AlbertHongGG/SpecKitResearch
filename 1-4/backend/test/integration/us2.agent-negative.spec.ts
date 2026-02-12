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

describe('US2 agent negative', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us2-negative-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('rejects illegal agent transitions and closed writes', async () => {
    const customerLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'customer@example.com', password: 'CustomerPass123' })
      .expect(200);
    const customerLogin = LoginResponseSchema.parse(customerLoginRes.body);

    const agentLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'agent@example.com', password: 'AgentPass123' })
      .expect(200);
    const agentLogin = LoginResponseSchema.parse(agentLoginRes.body);

    const createTicketRes = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        title: `Negative ticket ${Date.now()}`,
        category: 'Billing',
        description: 'Initial',
      })
      .expect(201);

    const created = CreateTicketResponseSchema.parse(createTicketRes.body);
    const ticketId = created.ticket.id;

    await request(server)
      .post(`/tickets/${ticketId}/assignee`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({ assignee_id: agentLogin.user.id, expected_status: 'Open' })
      .expect(200);

    // Illegal: agent cannot jump from In Progress -> Closed
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'In Progress',
        to_status: 'Closed',
        expected_assignee_id: agentLogin.user.id,
      })
      .expect(400);

    // Illegal request: expected_assignee_id must match acting agent
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'In Progress',
        to_status: 'Resolved',
        expected_assignee_id: null,
      })
      .expect(400);

    // Resolve then customer closes
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'In Progress',
        to_status: 'Resolved',
        expected_assignee_id: agentLogin.user.id,
      })
      .expect(200);

    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({ from_status: 'Resolved', to_status: 'Closed' })
      .expect(200);

    // Closed: reject new message
    await request(server)
      .post(`/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({ content: 'Should fail', is_internal: false })
      .expect(400);

    // Closed: reject status change
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'Closed',
        to_status: 'Resolved',
        expected_assignee_id: agentLogin.user.id,
      })
      .expect(400);
  });
});
