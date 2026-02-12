import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  AuditAction,
  AuditEntityType,
  PrismaClient,
  TicketCategory,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/errors/http-exception.filter';
import { requestIdMiddleware } from '../../src/common/request/request-id.middleware';

type SupertestServer = Parameters<typeof request>[0];

const LoginResponseSchema = z
  .object({
    token: z.string(),
    user: z
      .object({ id: z.string(), role: z.string(), email: z.string() })
      .passthrough(),
  })
  .passthrough();

const DashboardResponseSchema = z
  .object({
    sla: z.object({
      first_response_time: z.object({
        avg_seconds: z.number().nullable(),
        p50_seconds: z.number().nullable(),
        p90_seconds: z.number().nullable(),
      }),
      resolution_time: z.object({
        avg_seconds: z.number().nullable(),
        p50_seconds: z.number().nullable(),
        p90_seconds: z.number().nullable(),
      }),
    }),
    status_distribution: z.array(
      z.object({
        status: z.string(),
        count: z.number(),
      }),
    ),
    agent_load: z.array(
      z.object({
        agent_id: z.string(),
        in_progress_count: z.number(),
      }),
    ),
  })
  .passthrough();

describe('US3 dashboard', () => {
  let app: INestApplication;
  let server: SupertestServer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const dbName = `test-us3-dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
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

  it('aggregates SLA metrics, status distribution, and agent load within range', async () => {
    const adminLoginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123' })
      .expect(200);
    const adminLogin = LoginResponseSchema.parse(adminLoginRes.body);

    const agent = await prisma.user.findUnique({
      where: { email: 'agent@example.com' },
    });
    const customer = await prisma.user.findUnique({
      where: { email: 'customer@example.com' },
    });
    if (!agent || !customer) throw new Error('Seed users missing');

    const base = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // Ticket A: should contribute deterministic SLA numbers.
    const ticketA = await prisma.ticket.create({
      data: {
        title: 'Dashboard ticket A',
        category: TicketCategory.OTHER,
        status: TicketStatus.RESOLVED,
        customerId: customer.id,
        assigneeId: agent.id,
        createdAt: base,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticketA.id,
        authorId: agent.id,
        authorRole: UserRole.AGENT,
        content: 'Public reply',
        isInternal: false,
        createdAt: new Date(base.getTime() + 60 * 1000),
      },
    });

    // First response should be driven by earliest staff audit event (+30s).
    await prisma.auditLog.create({
      data: {
        entityType: AuditEntityType.TICKET,
        entityId: ticketA.id,
        action: AuditAction.ASSIGNEE_CHANGED,
        actorId: agent.id,
        metadataJson: JSON.stringify({}),
        createdAt: new Date(base.getTime() + 30 * 1000),
      },
    });

    // Resolution should be at +300s.
    await prisma.auditLog.create({
      data: {
        entityType: AuditEntityType.TICKET,
        entityId: ticketA.id,
        action: AuditAction.STATUS_CHANGED,
        actorId: agent.id,
        metadataJson: JSON.stringify({
          from_status: 'In Progress',
          to_status: 'Resolved',
        }),
        createdAt: new Date(base.getTime() + 300 * 1000),
      },
    });

    // Ticket B: contributes to agent load and status distribution.
    await prisma.ticket.create({
      data: {
        title: 'Dashboard ticket B',
        category: TicketCategory.OTHER,
        status: TicketStatus.IN_PROGRESS,
        customerId: customer.id,
        assigneeId: agent.id,
        createdAt: new Date(base.getTime() + 60 * 60 * 1000),
      },
    });

    const dashboardRes = await request(server)
      .get('/admin/dashboard?range=last_7_days')
      .set('Authorization', `Bearer ${adminLogin.token}`)
      .expect(200);

    const body = DashboardResponseSchema.parse(dashboardRes.body);

    expect(body.sla.first_response_time.avg_seconds).toBe(30);
    expect(body.sla.first_response_time.p50_seconds).toBe(30);
    expect(body.sla.first_response_time.p90_seconds).toBe(30);

    expect(body.sla.resolution_time.avg_seconds).toBe(300);
    expect(body.sla.resolution_time.p50_seconds).toBe(300);
    expect(body.sla.resolution_time.p90_seconds).toBe(300);

    const byStatus = new Map(
      body.status_distribution.map((s) => [s.status, s.count]),
    );
    expect(byStatus.get('Resolved')).toBe(1);
    expect(byStatus.get('In Progress')).toBe(1);

    expect(body.agent_load).toEqual([
      {
        agent_id: agent.id,
        in_progress_count: 1,
      },
    ]);
  });
});
