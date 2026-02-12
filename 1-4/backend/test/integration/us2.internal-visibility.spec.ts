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

const TicketDetailSchema = z
  .object({
    timeline: z.array(
      z
        .object({
          type: z.enum(['message', 'audit']),
        })
        .passthrough(),
    ),
  })
  .passthrough();

describe('US2 internal note visibility', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us2-visibility-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('customer never sees internal notes (messages or audit entries)', async () => {
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
        title: `Visibility ticket ${Date.now()}`,
        category: 'Technical',
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

    await request(server)
      .post(`/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .send({ content: 'Internal note', is_internal: true })
      .expect(201);

    const detailRes = await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .expect(200);

    const detail = TicketDetailSchema.parse(detailRes.body);

    const internalMessageTimelineItems = detail.timeline.filter((item) => {
      if (item.type !== 'message') return false;
      const msg = item.message as { is_internal?: boolean } | undefined;
      return msg?.is_internal === true;
    });

    expect(internalMessageTimelineItems).toHaveLength(0);

    const internalAuditTimelineItems = detail.timeline.filter((item) => {
      if (item.type !== 'audit') return false;
      const metadata = item.metadata as { is_internal?: boolean } | undefined;
      return metadata?.is_internal === true;
    });

    expect(internalAuditTimelineItems).toHaveLength(0);
  });
});
