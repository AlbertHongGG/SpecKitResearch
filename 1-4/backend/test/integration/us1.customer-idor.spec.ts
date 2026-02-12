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
    user: z.object({ id: z.string(), email: z.string() }).passthrough(),
  })
  .passthrough();

const CreateTicketResponseSchema = z
  .object({
    ticket: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();

describe('US1 customer IDOR (404)', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us1-idor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('other customer cannot read or write someone else ticket (404)', async () => {
    const customerLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'customer@example.com', password: 'CustomerPass123' })
      .expect(200);

    const customerLogin = LoginResponseSchema.parse(customerLoginRes.body);

    const otherEmail = `other+${Date.now()}@example.com`;
    const password = 'password123';

    await request(server)
      .post('/auth/register')
      .send({ email: otherEmail, password, password_confirm: password })
      .expect(201);

    const otherLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: otherEmail, password })
      .expect(200);

    const otherLogin = LoginResponseSchema.parse(otherLoginRes.body);

    const createTicketRes = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .send({
        title: `Secret ticket ${Date.now()}`,
        category: 'Billing',
        description: 'Top secret',
      })
      .expect(201);

    const created = CreateTicketResponseSchema.parse(createTicketRes.body);
    const ticketId = created.ticket.id;

    await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${otherLogin.token}`)
      .expect(404);

    await request(server)
      .post(`/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${otherLogin.token}`)
      .send({ content: 'I should not', is_internal: false })
      .expect(404);

    await request(server)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${otherLogin.token}`)
      .send({ from_status: 'Resolved', to_status: 'Closed' })
      .expect(404);
  });
});
