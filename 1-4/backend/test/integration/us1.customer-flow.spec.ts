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
    ticket: z.object({ id: z.string(), status: z.string() }).passthrough(),
  })
  .passthrough();

const TicketDetailSchema = z
  .object({
    ticket: z.object({ id: z.string(), status: z.string() }).passthrough(),
    timeline: z.array(z.unknown()),
  })
  .passthrough();

describe('US1 customer flow', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us1-flow-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('customer creates ticket, agent progresses, customer replies, agent resolves, customer closes', async () => {
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
        title: `Need help ${Date.now()}`,
        category: 'Technical',
        description: 'Initial description',
      })
      .expect(201);

    const created = CreateTicketResponseSchema.parse(createTicketRes.body);
    const ticketId = created.ticket.id;

    await request(server)
      .get('/tickets')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .expect(200);

    const detail1 = await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .expect(200);

    TicketDetailSchema.parse(detail1.body);

    // Agent takes the ticket (Open -> In Progress)
    await request(server)
      .post(`/tickets/${ticketId}/assignee`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({ assignee_id: agentLogin.user.id, expected_status: 'Open' })
      .expect(200);

    // Agent requests info from customer (In Progress -> Waiting for Customer)
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'In Progress',
        to_status: 'Waiting for Customer',
        expected_assignee_id: agentLogin.user.id,
      })
      .expect(200);

    // Customer replies (message allowed only in Waiting for Customer)
    await request(server)
      .post(`/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({ content: 'Here is more info', is_internal: false })
      .expect(201);

    // Customer indicates they responded (Waiting for Customer -> In Progress)
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({ from_status: 'Waiting for Customer', to_status: 'In Progress' })
      .expect(200);

    // Agent resolves (In Progress -> Resolved)
    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({
        from_status: 'In Progress',
        to_status: 'Resolved',
        expected_assignee_id: agentLogin.user.id,
      })
      .expect(200);

    // Customer closes (Resolved -> Closed)
    const closedRes = await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({ from_status: 'Resolved', to_status: 'Closed' })
      .expect(200);

    expect(closedRes.headers['x-request-id']).toBeTruthy();

    const detail2 = await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .expect(200);

    const parsedDetail = TicketDetailSchema.parse(detail2.body);
    expect(parsedDetail.ticket.status).toBe('Closed');
  });
});
