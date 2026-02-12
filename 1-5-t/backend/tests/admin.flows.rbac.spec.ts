import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { TestClient } from './testClient.js';
import { seedUser } from './testSeed.js';

describe('US3 admin flows RBAC', () => {
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

  it('GET/POST/PUT/deactivate require Admin (401 unauth, 403 non-admin)', async () => {
    const admin = await seedUser({ email: 'admin-t134@example.com', password: 'pw', role: 'Admin' });
    const user = await seedUser({ email: 'user-t134@example.com', password: 'pw', role: 'User' });
    const reviewer = await seedUser({ email: 'rev-t134@example.com', password: 'pw', role: 'Reviewer' });

    const unauth = new TestClient(app!);
    expect((await unauth.request({ method: 'GET', url: '/api/admin/flows' })).statusCode).toBe(401);
    expect(
      (
        await unauth.request({
          method: 'POST',
          url: '/api/admin/flows',
          json: {
            name: 'T',
            isActive: true,
            steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
          },
        })
      ).statusCode,
    ).toBe(401);

    const userClient = new TestClient(app!);
    expect((await userClient.login(user.email, 'pw')).statusCode).toBe(200);

    expect((await userClient.request({ method: 'GET', url: '/api/admin/flows' })).statusCode).toBe(403);
    expect(
      (
        await userClient.request({
          method: 'POST',
          url: '/api/admin/flows',
          json: {
            name: 'T',
            isActive: true,
            steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
          },
        })
      ).statusCode,
    ).toBe(403);

    const adminClient = new TestClient(app!);
    expect((await adminClient.login(admin.email, 'pw')).statusCode).toBe(200);

    const listRes = await adminClient.request({ method: 'GET', url: '/api/admin/flows' });
    expect(listRes.statusCode).toBe(200);

    const createRes = await adminClient.request({
      method: 'POST',
      url: '/api/admin/flows',
      json: {
        name: 'Created by Admin',
        isActive: true,
        steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
      },
    });
    expect(createRes.statusCode).toBe(200);
    const { templateId } = createRes.json() as any;
    expect(typeof templateId).toBe('string');

    expect((await unauth.request({ method: 'PUT', url: `/api/admin/flows/${templateId}` })).statusCode).toBe(401);
    expect(
      (
        await userClient.request({
          method: 'PUT',
          url: `/api/admin/flows/${templateId}`,
          json: {
            name: 'User update',
            isActive: true,
            steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
          },
        })
      ).statusCode,
    ).toBe(403);

    const updateRes = await adminClient.request({
      method: 'PUT',
      url: `/api/admin/flows/${templateId}`,
      json: {
        name: 'Updated by Admin',
        isActive: true,
        steps: [{ stepKey: 'S1', orderIndex: 0, mode: 'Serial', assigneeIds: [reviewer.id] }],
      },
    });
    expect(updateRes.statusCode).toBe(200);

    expect((await unauth.request({ method: 'POST', url: `/api/admin/flows/${templateId}/deactivate` })).statusCode).toBe(
      401,
    );
    expect(
      (
        await userClient.request({ method: 'POST', url: `/api/admin/flows/${templateId}/deactivate` })
      ).statusCode,
    ).toBe(403);

    const deactRes = await adminClient.request({ method: 'POST', url: `/api/admin/flows/${templateId}/deactivate` });
    expect(deactRes.statusCode).toBe(200);
    expect(deactRes.json()).toEqual({ ok: true });
  });
});
