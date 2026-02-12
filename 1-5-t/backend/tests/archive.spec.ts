import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US3 archive: Approved-only + Admin-only', () => {
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

  it('returns 401 unauth, 403 non-admin, 409 if not Approved, 200 archives Approved', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const admin = await seedUser({ email: 'admin-arch@example.com', password: 'pw', role: 'Admin' });
    const owner = await seedUser({ email: 'owner-arch@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'rev-arch@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'Archive-flow',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
    });

    const ownerClient = new TestClient(app!);
    expect((await ownerClient.login(owner.email, 'pw')).statusCode).toBe(200);
    const created = await ownerClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = created.json() as any;

    const unauth = new TestClient(app!);
    // CSRF cookie must be established first; otherwise onRequest CSRF hook returns 403 before auth/RBAC.
    await unauth.request({ method: 'GET', url: '/__csrf' });
    expect((await unauth.request({ method: 'POST', url: `/api/documents/${documentId}/archive` })).statusCode).toBe(401);

    // non-admin cannot archive
    expect((await ownerClient.request({ method: 'POST', url: `/api/documents/${documentId}/archive` })).statusCode).toBe(403);

    // admin cannot archive unless Approved
    const adminClient = new TestClient(app!);
    expect((await adminClient.login(admin.email, 'pw')).statusCode).toBe(200);
    const notApprovedRes = await adminClient.request({ method: 'POST', url: `/api/documents/${documentId}/archive` });
    expect(notApprovedRes.statusCode).toBe(409);

    // make it Approved, then archive
    await ownerClient.request({ method: 'POST', url: `/api/documents/${documentId}/submit`, json: { templateId: template.id } });

    const reviewerClient = new TestClient(app!);
    expect((await reviewerClient.login(reviewer.email, 'pw')).statusCode).toBe(200);
    const tasks = ((await reviewerClient.request({ method: 'GET', url: '/api/reviews/tasks' })).json() as any).tasks as Array<any>;
    expect(tasks).toHaveLength(1);
    const taskId = tasks[0]!.id as string;
    expect((await reviewerClient.request({ method: 'POST', url: `/api/reviews/tasks/${taskId}/approve` })).statusCode).toBe(200);

    const approved = await prisma.document.findUnique({ where: { id: documentId } });
    expect(approved?.status).toBe('Approved');

    const archiveRes = await adminClient.request({ method: 'POST', url: `/api/documents/${documentId}/archive` });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json()).toEqual({ ok: true });

    const archived = await prisma.document.findUnique({ where: { id: documentId } });
    expect(archived?.status).toBe('Archived');
  });
});
