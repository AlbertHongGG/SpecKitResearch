import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US2 review progression (Serial/Parallel) -> Approved', () => {
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

  it('serial step creates next-step tasks and final step approves document', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const owner = await seedUser({ email: 'owner3@example.com', password: 'pw', role: 'User' });
    const reviewer1 = await seedUser({ email: 'revE@example.com', password: 'pw', role: 'Reviewer' });
    const reviewer2 = await seedUser({ email: 'revF@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'Serial-2',
      steps: [
        { stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer1.id] },
        { stepKey: 'S2', orderIndex: 1, mode: 'Serial', assigneeIds: [reviewer2.id] },
      ],
    });

    const ownerClient = new TestClient(app!);
    expect((await ownerClient.login(owner.email, 'pw')).statusCode).toBe(200);
    const created = await ownerClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = created.json() as any;
    await ownerClient.request({ method: 'POST', url: `/api/documents/${documentId}/submit`, json: { templateId: template.id } });

    const r1 = new TestClient(app!);
    expect((await r1.login(reviewer1.email, 'pw')).statusCode).toBe(200);
    const r1Tasks = (await r1.request({ method: 'GET', url: '/api/reviews/tasks' })).json() as any;
    const r1TaskId = r1Tasks.tasks[0]!.id as string;
    expect((await r1.request({ method: 'POST', url: `/api/reviews/tasks/${r1TaskId}/approve` })).statusCode).toBe(200);

    const r2 = new TestClient(app!);
    expect((await r2.login(reviewer2.email, 'pw')).statusCode).toBe(200);
    const r2TasksRes = await r2.request({ method: 'GET', url: '/api/reviews/tasks' });
    const r2Tasks = (r2TasksRes.json() as any).tasks as Array<any>;
    expect(r2Tasks).toHaveLength(1);
    expect(r2Tasks[0]!.stepKey).toBe('S2');

    const r2TaskId = r2Tasks[0]!.id as string;
    expect((await r2.request({ method: 'POST', url: `/api/reviews/tasks/${r2TaskId}/approve` })).statusCode).toBe(200);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(doc?.status).toBe('Approved');
  });

  it('parallel final step requires all approvals before document becomes Approved', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const owner = await seedUser({ email: 'owner4@example.com', password: 'pw', role: 'User' });
    const reviewer1 = await seedUser({ email: 'revG@example.com', password: 'pw', role: 'Reviewer' });
    const reviewer2 = await seedUser({ email: 'revH@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'Parallel-final',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Parallel', assigneeIds: [reviewer1.id, reviewer2.id] }],
    });

    const ownerClient = new TestClient(app!);
    expect((await ownerClient.login(owner.email, 'pw')).statusCode).toBe(200);
    const created = await ownerClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = created.json() as any;
    await ownerClient.request({ method: 'POST', url: `/api/documents/${documentId}/submit`, json: { templateId: template.id } });

    const r1 = new TestClient(app!);
    expect((await r1.login(reviewer1.email, 'pw')).statusCode).toBe(200);
    const r1TaskId = ((await r1.request({ method: 'GET', url: '/api/reviews/tasks' })).json() as any).tasks[0]!.id as string;
    expect((await r1.request({ method: 'POST', url: `/api/reviews/tasks/${r1TaskId}/approve` })).statusCode).toBe(200);

    const mid = await prisma.document.findUnique({ where: { id: documentId } });
    expect(mid?.status).toBe('InReview');

    const r2 = new TestClient(app!);
    expect((await r2.login(reviewer2.email, 'pw')).statusCode).toBe(200);
    const r2TaskId = ((await r2.request({ method: 'GET', url: '/api/reviews/tasks' })).json() as any).tasks[0]!.id as string;
    expect((await r2.request({ method: 'POST', url: `/api/reviews/tasks/${r2TaskId}/approve` })).statusCode).toBe(200);

    const done = await prisma.document.findUnique({ where: { id: documentId } });
    expect(done?.status).toBe('Approved');
  });
});
