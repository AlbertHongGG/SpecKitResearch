import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedUser } from './testSeed.js';

describe('US3 template completeness: step without assignees -> submit 400', () => {
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

  it('rejects submit when any template step has 0 assignees', async () => {
    const { prisma } = await import('../src/db/prisma.js');

    const owner = await seedUser({ email: 'owner-t133@example.com', password: 'pw', role: 'User' });

    const template = await prisma.approvalFlowTemplate.create({
      data: {
        name: 'Bad template (no assignees)',
        isActive: true,
        steps: {
          create: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial' }],
        },
      },
    });

    const client = new TestClient(app!);
    expect((await client.login(owner.email, 'pw')).statusCode).toBe(200);

    const createRes = await client.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    const { documentId } = createRes.json() as any;

    const submitRes = await client.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });

    expect(submitRes.statusCode).toBe(400);

    const versions = await prisma.documentVersion.count({ where: { documentId } });
    expect(versions).toBe(1);

    const tasks = await prisma.reviewTask.count({ where: { documentId } });
    expect(tasks).toBe(0);
  });
});
