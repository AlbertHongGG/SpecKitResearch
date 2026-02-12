import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedActiveTemplate, seedUser } from './testSeed.js';

describe('US1 Draft-only write rules', () => {
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

  it('rejects unsafe requests without CSRF header (403)', async () => {
    const user = await seedUser({ email: 'u1@example.com', password: 'pw', role: 'User' });

    const client = new TestClient(app!);
    const loginRes = await client.login(user.email, 'pw');
    expect(loginRes.statusCode).toBe(200);

    const res = await client.request({
      method: 'POST',
      url: '/api/documents',
      withCsrf: false,
      json: { title: 'Doc' },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json() as any;
    expect(body?.error?.code).toBe('Forbidden');
  });

  it('rejects updateDraft/uploadAttachment after submit (409 Conflict)', async () => {
    const user = await seedUser({ email: 'u2@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'r1@example.com', password: 'pw', role: 'Reviewer' });

    const template = await seedActiveTemplate({
      name: 'T',
      steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
    });

    const client = new TestClient(app!);
    expect((await client.login(user.email, 'pw')).statusCode).toBe(200);

    const createRes = await client.request({ method: 'POST', url: '/api/documents', json: { title: 'Doc' } });
    expect(createRes.statusCode).toBe(201);
    const { documentId } = createRes.json() as any;

    const submitRes = await client.request({
      method: 'POST',
      url: `/api/documents/${documentId}/submit`,
      json: { templateId: template.id },
    });
    expect(submitRes.statusCode).toBe(200);

    const updateRes = await client.request({
      method: 'PUT',
      url: `/api/documents/${documentId}/draft`,
      json: { title: 'Changed', content: 'Changed' },
    });
    expect(updateRes.statusCode).toBe(409);

    const boundary = '----speckit-test-boundary';
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="a.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `hello\r\n` +
      `--${boundary}--\r\n`;

    const attachRes = await client.request({
      method: 'POST',
      url: `/api/documents/${documentId}/attachments`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody,
    });
    expect(attachRes.statusCode).toBe(409);

    const { prisma } = await import('../src/db/prisma.js');
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(doc?.status).toBe('InReview');
  });
});
