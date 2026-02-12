import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

describe('auth routes', () => {
  it('register -> me -> logout', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const register = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin: config.WEB_ORIGIN },
        payload: { email: 'a@example.com', password: 'password123', displayName: 'A' },
      });
      expect(register.statusCode).toBe(200);

      const cookie = cookieHeaderFromSetCookie(register.headers['set-cookie'] as any);
      expect(cookie).toContain('tl_access');
      expect(cookie).toContain('tl_refresh');

      const me = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { cookie },
      });
      expect(me.statusCode).toBe(200);
      const meJson = me.json();
      expect(meJson.user.email).toBe('a@example.com');

      const logout = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { origin: config.WEB_ORIGIN, cookie },
      });
      expect(logout.statusCode).toBe(204);
    } finally {
      await cleanup();
    }
  });

  it('login fails with wrong password', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin: config.WEB_ORIGIN },
        payload: { email: 'b@example.com', password: 'password123', displayName: 'B' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { origin: config.WEB_ORIGIN },
        payload: { email: 'b@example.com', password: 'wrong' },
      });
      expect(res.statusCode).toBe(401);
    } finally {
      await cleanup();
    }
  });

  it('refresh rotates session', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const login = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin: config.WEB_ORIGIN },
        payload: { email: 'c@example.com', password: 'password123', displayName: 'C' },
      });
      const cookie1 = cookieHeaderFromSetCookie(login.headers['set-cookie'] as any);

      const refresh = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { origin: config.WEB_ORIGIN, cookie: cookie1 },
      });
      expect(refresh.statusCode).toBe(200);
      const cookie2 = cookieHeaderFromSetCookie(refresh.headers['set-cookie'] as any);
      expect(cookie2).toContain('tl_access');
      expect(cookie2).toContain('tl_refresh');
      expect(cookie2).not.toBe(cookie1);
    } finally {
      await cleanup();
    }
  });
});
