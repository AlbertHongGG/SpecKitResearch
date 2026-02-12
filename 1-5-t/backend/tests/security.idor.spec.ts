import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('T139 IDOR matrix (User/Reviewer/Admin)', () => {
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

  it('enforces 404 existence hiding for non-owners/non-assignees, and returns requestId header', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const userA = await seedUser({ email: 'uA@example.com', password: 'pw', role: 'User' });
    const userB = await seedUser({ email: 'uB@example.com', password: 'pw', role: 'User' });
    const reviewer1 = await seedUser({ email: 'rA@example.com', password: 'pw', role: 'Reviewer' });
    const reviewer2 = await seedUser({ email: 'rB@example.com', password: 'pw', role: 'Reviewer' });
    const admin = await seedUser({ email: 'adminA@example.com', password: 'pw', role: 'Admin' });

    const template = await seedActiveTemplate({
      name: 'T',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer2.id] }],
    });

    const clientB = new TestClient(app!);
    expect((await clientB.login(userB.email, 'pw')).statusCode).toBe(200);

    const createRes = await clientB.request({ method: 'POST', url: '/api/documents', json: { title: 'SecretDoc' } });
    expect(createRes.statusCode).toBe(201);
    const { documentId } = createRes.json() as any;

    // User A should not be able to see or mutate User B's document.
    const clientA = new TestClient(app!);
    expect((await clientA.login(userA.email, 'pw')).statusCode).toBe(200);

    const getAsA = await clientA.request({ method: 'GET', url: `/api/documents/${documentId}` });
    expect(getAsA.statusCode).toBe(404);
    expect(getAsA.headers['x-request-id']).toBeTruthy();
    expect((getAsA.json() as any).error?.requestId).toBeTruthy();

    const updateAsA = await clientA.request({
      method: 'PUT',
      url: `/api/documents/${documentId}/draft`,
      json: { title: 'Hack', content: 'Hack' },
    });
    expect(updateAsA.statusCode).toBe(404);

    const submitAsA = await clientA.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitAsA.statusCode).toBe(404);

    // Reviewer not assigned to any task on the document should get 404.
    const reviewerClient1 = new TestClient(app!);
    expect((await reviewerClient1.login(reviewer1.email, 'pw')).statusCode).toBe(200);

    const getAsReviewer1 = await reviewerClient1.request({ method: 'GET', url: `/api/documents/${documentId}` });
    expect(getAsReviewer1.statusCode).toBe(404);

    // Submit as the real owner to create a task assigned to reviewer2.
    const submitAsB = await clientB.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitAsB.statusCode).toBe(200);

    const task = await prisma.reviewTask.findFirst({ where: { documentId, status: 'Pending' } });
    expect(task).toBeTruthy();

    // Reviewer1 should not be able to act on Reviewer2's task (existence hidden).
    const actOtherTask = await reviewerClient1.request({
      method: 'POST',
      url: `/api/reviews/tasks/${task!.id}/approve`,
      json: {},
    });
    expect(actOtherTask.statusCode).toBe(404);

    // Assigned reviewer can access doc + list tasks.
    const reviewerClient2 = new TestClient(app!);
    expect((await reviewerClient2.login(reviewer2.email, 'pw')).statusCode).toBe(200);

    const getAsReviewer2 = await reviewerClient2.request({ method: 'GET', url: `/api/documents/${documentId}` });
    expect(getAsReviewer2.statusCode).toBe(200);
    expect(getAsReviewer2.headers['x-request-id']).toBeTruthy();

    // Admin can access any document.
    const adminClient = new TestClient(app!);
    expect((await adminClient.login(admin.email, 'pw')).statusCode).toBe(200);

    const getAsAdmin = await adminClient.request({ method: 'GET', url: `/api/documents/${documentId}` });
    expect(getAsAdmin.statusCode).toBe(200);
  });
});
