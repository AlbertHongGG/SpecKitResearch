import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US1 submit + reopen flow', () => {
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

  it('submit locks a new version and creates review tasks + audit log', async () => {
    const { prisma } = await import('../src/db/prisma.js');
    const user = await seedUser({ email: 'u3@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'r2@example.com', password: 'pw', role: 'Reviewer' });

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

    const beforeVersions = await prisma.documentVersion.count({ where: { documentId } });
    expect(beforeVersions).toBe(1);

    const submitRes = await client.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitRes.statusCode).toBe(200);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(doc?.status).toBe('InReview');
    expect(doc?.flowTemplateId).toBe(template.id);

    const versions = await prisma.documentVersion.findMany({ where: { documentId }, orderBy: { versionNo: 'asc' } });
    expect(versions.map((v: any) => v.versionNo)).toEqual([1, 2]);
    const locked = versions[1]!;
    expect(doc?.currentVersionId).toBe(locked.id);
    expect(locked.content).toBe('Hello');

    const tasks = await prisma.reviewTask.findMany({ where: { documentId, status: 'Pending' } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.assigneeId).toBe(reviewer.id);

    const audit = await prisma.auditLog.findMany({ where: { entityType: 'Document', entityId: documentId } });
    expect(audit.some((a: any) => a.action === 'Document.SubmitForApproval')).toBe(true);
  });

  it('submit failure rolls back (no new version/tasks) and rejected -> reopen creates a new draft version', async () => {
    const { prisma } = await import('../src/db/prisma.js');
    const user = await seedUser({ email: 'u4@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'r3@example.com', password: 'pw', role: 'Reviewer' });

    const invalidTemplate = await prisma.approvalFlowTemplate.create({
      data: { name: 'Invalid', isActive: true },
    });

    const validTemplate = await seedActiveTemplate({
      name: 'Valid',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
    });

    const userClient = new TestClient(app!);
    expect((await userClient.login(user.email, 'pw')).statusCode).toBe(200);

    const createRes = await userClient.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = createRes.json() as any;

    const failRes = await userClient.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: invalidTemplate.id },
    });
    expect(failRes.statusCode).toBe(400);

    const versionsAfterFail = await prisma.documentVersion.count({ where: { documentId } });
    expect(versionsAfterFail).toBe(1);
    const tasksAfterFail = await prisma.reviewTask.count({ where: { documentId } });
    expect(tasksAfterFail).toBe(0);

    const okSubmit = await userClient.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: validTemplate.id },
    });
    expect(okSubmit.statusCode).toBe(200);

    const reviewerClient = new TestClient(app!);
    expect((await reviewerClient.login(reviewer.email, 'pw')).statusCode).toBe(200);
    const listTasksRes = await reviewerClient.request({ method: 'GET', url: '/api/reviews/tasks' });
    expect(listTasksRes.statusCode).toBe(200);

    const tasks = (listTasksRes.json() as any).tasks as Array<any>;
    expect(tasks).toHaveLength(1);
    const taskId = tasks[0]!.id;

    const rejectRes = await reviewerClient.request({
      method: 'POST',
      url: `/api/reviews/tasks/${taskId}/reject`,
      json: { reason: 'Need changes' },
    });
    expect(rejectRes.statusCode).toBe(200);

    const rejectedDoc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(rejectedDoc?.status).toBe('Rejected');

    const reopenRes = await userClient.request({ method: 'POST', url: `/api/documents/${documentId}/reopen` });
    expect(reopenRes.statusCode).toBe(200);

    const reopened = await prisma.document.findUnique({ where: { id: documentId } });
    expect(reopened?.status).toBe('Draft');

    const versions = await prisma.documentVersion.findMany({ where: { documentId }, orderBy: { versionNo: 'asc' } });
    expect(versions.map((v: any) => v.versionNo)).toEqual([1, 2, 3]);
    expect(reopened?.currentVersionId).toBe(versions[2]!.id);
  });
});
