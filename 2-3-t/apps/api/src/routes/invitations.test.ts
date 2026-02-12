import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

async function register(app: any, origin: string, input: { email: string; password?: string; displayName?: string }) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    headers: { origin },
    payload: {
      email: input.email,
      password: input.password ?? 'password123',
      displayName: input.displayName ?? 'User',
    },
  });
  expect(res.statusCode).toBe(200);
  return cookieHeaderFromSetCookie(res.headers['set-cookie'] as any);
}

describe('invitations routes', () => {
  it('owner can invite and invitee can accept', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const ownerCookie = await register(app, config.WEB_ORIGIN, { email: 'owner@example.com', displayName: 'Owner' });

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P1', description: null },
      });
      expect(projectRes.statusCode).toBe(201);
      const project = projectRes.json();

      const invRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/invitations`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { email: 'member@example.com', role: 'member' },
      });
      expect(invRes.statusCode).toBe(201);
      const invitation = invRes.json();

      const listRes = await app.inject({
        method: 'GET',
        url: `/projects/${project.id}/invitations`,
        headers: { cookie: ownerCookie },
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().invitations.length).toBe(1);

      const memberCookie = await register(app, config.WEB_ORIGIN, { email: 'member@example.com', displayName: 'Member' });

      const acceptRes = await app.inject({
        method: 'POST',
        url: `/invitations/${invitation.id}/accept`,
        headers: { origin: config.WEB_ORIGIN, cookie: memberCookie },
      });
      expect(acceptRes.statusCode).toBe(200);
      const membership = acceptRes.json();
      expect(membership.projectId).toBe(project.id);
      expect(membership.role).toBe('member');
    } finally {
      await cleanup();
    }
  });
});
