import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

describe('projects routes', () => {
  it('401 when not authenticated', async () => {
    const { app, cleanup } = await createTestApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/projects' });
      expect(res.statusCode).toBe(401);
    } finally {
      await cleanup();
    }
  });

  it('200 with empty list after register', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const register = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin: config.WEB_ORIGIN },
        payload: { email: 'p@example.com', password: 'password123', displayName: 'P' },
      });
      const cookie = cookieHeaderFromSetCookie(register.headers['set-cookie'] as any);

      const res = await app.inject({
        method: 'GET',
        url: '/projects',
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json.projects)).toBe(true);
      expect(Array.isArray(json.invitations)).toBe(true);
    } finally {
      await cleanup();
    }
  });
});
