import { describe, expect, it } from 'vitest';

import { setupTestDb } from './_helpers/test-db';
import { createTestApp, injectJson } from './_helpers/test-app';

describe('health + headers', () => {
  it('GET /health returns ok and includes security + request id headers', async () => {
    const db = setupTestDb();
    const app = await createTestApp();

    try {
      const res = await injectJson(app, { method: 'GET', url: '/health' });

      expect(res.statusCode).toBe(200);
      expect(res.json).toEqual({ ok: true });

      expect(res.headers['x-request-id']).toBeTruthy();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    } finally {
      await app.close();
      db.cleanup();
    }
  });

  it('404 responses use standard error shape and include request_id', async () => {
    const db = setupTestDb();
    const app = await createTestApp();

    try {
      const res = await injectJson(app, { method: 'GET', url: '/does-not-exist' });

      expect(res.statusCode).toBe(404);
      expect(res.headers['x-request-id']).toBeTruthy();
      expect(res.json?.error?.code).toBeTruthy();
      expect(res.json?.error?.message).toBeTruthy();
      expect(res.json?.error?.request_id).toBe(res.headers['x-request-id']);
    } finally {
      await app.close();
      db.cleanup();
    }
  });
});
