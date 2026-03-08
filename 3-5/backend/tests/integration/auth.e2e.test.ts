import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

describe('US1 Auth (register/login/logout)', () => {
  let app: NestFastifyApplication;
  let cleanupDb: (() => void) | undefined;

  beforeAll(async () => {
    const db = setupTestDb();
    cleanupDb = db.cleanup;
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    cleanupDb?.();
  });

  it('registers and logs in with a session cookie', async () => {
    const email = 'dev@example.com';
    const password = 'password123';

    const registerRes = await injectJson(app, {
      method: 'POST',
      url: '/register',
      body: { email, password }
    });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.json?.email).toBe(email.toLowerCase());
    expect(registerRes.json?.role).toBe('developer');

    const loginRes = await injectJson(app, {
      method: 'POST',
      url: '/login',
      body: { email, password }
    });

    expect(loginRes.statusCode).toBe(200);
    const setCookies = getSetCookieHeader(loginRes.headers);
    expect(setCookies.length).toBeGreaterThan(0);
    const cookieHeader = buildCookieHeader(setCookies);
    expect(cookieHeader).toContain('ap_session=');

    const meRes = await injectJson(app, {
      method: 'GET',
      url: '/me',
      headers: { cookie: cookieHeader }
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json?.email).toBe(email.toLowerCase());
  });

  it('logs out and clears session', async () => {
    const email = 'dev2@example.com';
    const password = 'password123';

    await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
    const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
    const cookieHeader = buildCookieHeader(getSetCookieHeader(loginRes.headers));

    const logoutRes = await injectJson(app, {
      method: 'POST',
      url: '/logout',
      headers: { cookie: cookieHeader }
    });
    expect(logoutRes.statusCode).toBe(204);

    const meRes = await injectJson(app, {
      method: 'GET',
      url: '/me',
      headers: { cookie: cookieHeader }
    });
    expect(meRes.statusCode).toBe(401);
  });
});
