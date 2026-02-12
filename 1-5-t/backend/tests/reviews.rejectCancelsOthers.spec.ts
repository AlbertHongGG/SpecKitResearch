import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US2 reject cancels other pending tasks', () => {
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

  it('reject marks document Rejected and cancels other Pending tasks', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const owner = await seedUser({ email: 'owner2@example.com', password: 'pw', role: 'User' });
    const reviewerA = await seedUser({ email: 'revC@example.com', password: 'pw', role: 'Reviewer' });
    const reviewerB = await seedUser({ email: 'revD@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'Parallel-1',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Parallel', assigneeIds: [reviewerA.id, reviewerB.id] }],
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
    const taskId = ((listRes.json() as any).tasks as Array<any>)[0]!.id as string;

    const rejectRes = await reviewerClient.request({
      method: 'POST',
      url: `/api/reviews/tasks/${taskId}/reject`,
      json: { reason: 'Nope' },
    });
    expect(rejectRes.statusCode).toBe(200);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(doc?.status).toBe('Rejected');

    const tasks = await prisma.reviewTask.findMany({ where: { documentId }, orderBy: { createdAt: 'asc' } });
    expect(tasks).toHaveLength(2);
    const statuses = tasks.map((t: any) => t.status).sort();
    expect(statuses).toEqual(['Cancelled', 'Rejected']);
  });
});
