import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US2 review task one-time semantics + existence hiding', () => {
  let cleanupDb: (() => Promise<void>) | undefined;
  let app: Awaited<ReturnType<typeof createTestApp>> | undefined;

  beforeAll(async () => {
    const db = await createTestDb();
    cleanupDb = db.cleanup;
    process.env.DATABASE_URL = db.databaseUrl;
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';

    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (cleanupDb) await cleanupDb();
  });

  it('second approve returns 409 and does not duplicate ApprovalRecord', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const owner = await seedUser({ email: 'owner1@example.com', password: 'pw', role: 'User' });
    const reviewerA = await seedUser({ email: 'revA@example.com', password: 'pw', role: 'Reviewer' });
    const reviewerB = await seedUser({ email: 'revB@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'Serial-1',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewerA.id] }],
    });

    const ownerClient = new TestClient(app!);
    expect((await ownerClient.login(owner.email, 'pw')).statusCode).toBe(200);

    const created = await ownerClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = created.json() as any;

    await ownerClient.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });

    const reviewerClient = new TestClient(app!);
    expect((await reviewerClient.login(reviewerA.email, 'pw')).statusCode).toBe(200);

    const listRes = await reviewerClient.request({ method: 'GET', url: '/api/reviews/tasks' });
    expect(listRes.statusCode).toBe(200);
    const tasks = (listRes.json() as any).tasks as Array<any>;
    expect(tasks).toHaveLength(1);
    const taskId = tasks[0]!.id as string;

    const approve1 = await reviewerClient.request({ method: 'POST', url: `/api/reviews/tasks/${taskId}/approve` });
    expect(approve1.statusCode).toBe(200);

    const approve2 = await reviewerClient.request({ method: 'POST', url: `/api/reviews/tasks/${taskId}/approve` });
    expect(approve2.statusCode).toBe(409);
    expect((approve2.json() as any)?.error?.code).toBe('Conflict');

    const records = await prisma.approvalRecord.findMany({ where: { reviewTaskId: taskId } });
    expect(records).toHaveLength(1);

    // Reviewer existence hiding: another reviewer should see 404, not 403.
    const otherReviewerClient = new TestClient(app!);
    expect((await otherReviewerClient.login(reviewerB.email, 'pw')).statusCode).toBe(200);
    const forbidden = await otherReviewerClient.request({ method: 'POST', url: `/api/reviews/tasks/${taskId}/approve` });
    expect(forbidden.statusCode).toBe(404);
    expect((forbidden.json() as any)?.error?.code).toBe('NotFound');
  });
});
