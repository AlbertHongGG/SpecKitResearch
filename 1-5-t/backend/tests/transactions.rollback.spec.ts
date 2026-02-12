import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('T149 transaction rollback verification', () => {
  let cleanupDb: (() => Promise<void>) | undefined;
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;

  beforeAll(async () => {
    const db = await createTestDb();
    cleanupDb = db.cleanup;
    process.env.DATABASE_URL = db.databaseUrl;
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';

    // Install a middleware that can simulate DB write failures.
    const { prisma, setPrismaClientForTests } = await import('../src/db/prisma.js');

    let failAuditForAction: string | null = null;
    let failApprovalForTaskId: string | null = null;

    // Expose toggles for tests below.
    (globalThis as any).__txFail = {
      setAuditAction(action: string | null) {
        failAuditForAction = action;
      },
      setApprovalTaskId(taskId: string | null) {
        failApprovalForTaskId = taskId;
      },
    };

    const prismaWithFailureInjection = prisma.$extends({
      query: {
        auditLog: {
          async create({ args, query }: any) {
            if (failAuditForAction && (args as any)?.data?.action === failAuditForAction) {
              throw new Error('Simulated audit write failure');
            }
            return query(args);
          },
        },
        approvalRecord: {
          async create({ args, query }: any) {
            if (failApprovalForTaskId && (args as any)?.data?.reviewTaskId === failApprovalForTaskId) {
              throw new Error('Simulated approval write failure');
            }
            return query(args);
          },
        },
      },
    });

    setPrismaClientForTests(prismaWithFailureInjection as any);

    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (cleanupDb) await cleanupDb();
  });

  it('audit write failure rolls back submit (no new version/tasks/status)', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const user = await seedUser({ email: 'u-rollback@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'r-rollback@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'T',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
    });

    const client = new TestClient(app!);
    expect((await client.login(user.email, 'pw')).statusCode).toBe(200);

    const createRes = await client.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = createRes.json() as any;

    await client.request({
      method: 'PUT',
      url: `/api/documents/${documentId}/draft`,
      json: { title: 'Doc', content: 'Hello' },
    });

    const versionsBefore = await prisma.documentVersion.count({ where: { documentId } });
    expect(versionsBefore).toBe(1);

    (globalThis as any).__txFail.setAuditAction('Document.SubmitForApproval');

    const submitRes = await client.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitRes.statusCode).toBe(500);

    (globalThis as any).__txFail.setAuditAction(null);

    const versionsAfter = await prisma.documentVersion.count({ where: { documentId } });
    expect(versionsAfter).toBe(1);

    const tasksAfter = await prisma.reviewTask.count({ where: { documentId } });
    expect(tasksAfter).toBe(0);

    const docAfter = await prisma.document.findUnique({ where: { id: documentId } });
    expect(docAfter?.status).toBe('Draft');

    const audit = await prisma.auditLog.findMany({ where: { entityType: 'Document', entityId: documentId } });
    expect(audit.some((a: any) => a.action === 'Document.SubmitForApproval')).toBe(false);
  });

  it('approval write failure rolls back approve (task stays Pending, no ApprovalRecord)', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const user = await seedUser({ email: 'u-approve-rollback@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'r-approve-rollback@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'T2',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
    });

    const userClient = new TestClient(app!);
    expect((await userClient.login(user.email, 'pw')).statusCode).toBe(200);

    const createRes = await userClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc2' } });
    const { documentId } = createRes.json() as any;

    await userClient.request({
      method: 'PUT',
      url: `/api/documents/${documentId}/draft`,
      json: { title: 'Doc2', content: 'Hello' },
    });

    const submitRes = await userClient.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitRes.statusCode).toBe(200);

    const task = await prisma.reviewTask.findFirst({ where: { documentId, status: 'Pending' } });
    expect(task).toBeTruthy();

    const reviewerClient = new TestClient(app!);
    expect((await reviewerClient.login(reviewer.email, 'pw')).statusCode).toBe(200);

    (globalThis as any).__txFail.setApprovalTaskId(task!.id);

    const approveRes = await reviewerClient.request({
      method: 'POST',
      url: `/api/reviews/tasks/${task!.id}/approve`,
      json: {},
    });
    expect(approveRes.statusCode).toBe(500);

    (globalThis as any).__txFail.setApprovalTaskId(null);

    const taskAfter = await prisma.reviewTask.findUnique({ where: { id: task!.id } });
    expect(taskAfter?.status).toBe('Pending');

    const recordCount = await prisma.approvalRecord.count({ where: { reviewTaskId: task!.id } });
    expect(recordCount).toBe(0);

    const docAfter = await prisma.document.findUnique({ where: { id: documentId } });
    expect(docAfter?.status).toBe('InReview');
  });
});
