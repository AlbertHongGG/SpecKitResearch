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
    user: z.object({ id: z.string(), role: z.string(), email: z.string() }),
  })
  .passthrough();

const TicketListResponseSchema = z
  .object({
    tickets: z.array(z.unknown()),
    total: z.number(),
  })
  .passthrough();

describe('Polish: list limit', () => {
  let app: INestApplication;
  let server: SupertestServer;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-polish-limit-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('customer /tickets supports limit and returns total', async () => {
    const customerLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'customer@example.com', password: 'CustomerPass123' })
      .expect(200);
    const customerLogin = LoginResponseSchema.parse(customerLoginRes.body);

    // Create a few tickets
    for (let i = 0; i < 3; i++) {
      await request(server)
        .post('/tickets')
        .set('Authorization', `Bearer ${customerLogin.token}`)
        .send({
          title: `Limit test ${i} ${Date.now()}`,
          category: 'Technical',
          description: 'Initial description',
        })
        .expect(201);
    }

    const listRes = await request(server)
      .get('/tickets?limit=2')
      .set('Authorization', `Bearer ${customerLogin.token}`)
      .expect(200);

    const parsed = TicketListResponseSchema.parse(listRes.body);
    expect(parsed.total).toBeGreaterThanOrEqual(3);
    expect(parsed.tickets.length).toBeLessThanOrEqual(2);
  });

  it('agent /agent/tickets supports limit and validates range', async () => {
    const agentLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'agent@example.com', password: 'AgentPass123' })
      .expect(200);
    const agentLogin = LoginResponseSchema.parse(agentLoginRes.body);

    const unassigned = await request(server)
      .get('/agent/tickets?view=unassigned&limit=1')
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .expect(200);

    const parsed = TicketListResponseSchema.parse(unassigned.body);
    expect(parsed.tickets.length).toBeLessThanOrEqual(1);

    await request(server)
      .get('/agent/tickets?view=unassigned&limit=0')
      .set('Authorization', `Bearer ${agentLogin.token}`)
      .expect(400);
  });
});
