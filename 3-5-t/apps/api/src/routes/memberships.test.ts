import { describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, createTestApp } from '../test-utils/test-app';

async function register(app: any, origin: string, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    headers: { origin },
    payload: { email, password: 'password123', displayName: email.split('@')[0] },
  });
  expect(res.statusCode).toBe(200);
  return cookieHeaderFromSetCookie(res.headers['set-cookie'] as any);
}

describe('memberships routes', () => {
  it('owner can list and update a membership role (OCC)', async () => {
    const { app, config, cleanup } = await createTestApp();
    try {
      const ownerCookie = await register(app, config.WEB_ORIGIN, 'owner2@example.com');

      const projectRes = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { name: 'P2', description: null },
      });
      expect(projectRes.statusCode).toBe(201);
      const project = projectRes.json();

      // invite + accept to create a member
      const invRes = await app.inject({
        method: 'POST',
        url: `/projects/${project.id}/invitations`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { email: 'member2@example.com', role: 'viewer' },
      });
      expect(invRes.statusCode).toBe(201);
      const invitation = invRes.json();

      const memberCookie = await register(app, config.WEB_ORIGIN, 'member2@example.com');
      const acceptRes = await app.inject({
        method: 'POST',
        url: `/invitations/${invitation.id}/accept`,
        headers: { origin: config.WEB_ORIGIN, cookie: memberCookie },
      });
      expect(acceptRes.statusCode).toBe(200);

      const listRes = await app.inject({
        method: 'GET',
        url: `/projects/${project.id}/memberships`,
        headers: { cookie: ownerCookie },
      });
      expect(listRes.statusCode).toBe(200);
      const memberships = listRes.json().memberships as any[];
      const target = memberships.find((m) => m.role === 'viewer');
      expect(target).toBeTruthy();

      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}/memberships/${target.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
        payload: { version: target.version, role: 'member' },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().role).toBe('member');

      const delRes = await app.inject({
        method: 'DELETE',
        url: `/projects/${project.id}/memberships/${target.id}`,
        headers: { origin: config.WEB_ORIGIN, cookie: ownerCookie },
      });
      expect(delRes.statusCode).toBe(204);

      const listRes2 = await app.inject({
        method: 'GET',
        url: `/projects/${project.id}/memberships`,
        headers: { cookie: ownerCookie },
      });
      expect(listRes2.statusCode).toBe(200);
      const memberships2 = listRes2.json().memberships as any[];
      expect(memberships2.find((m) => m.id === target.id)).toBeFalsy();
    } finally {
      await cleanup();
    }
  });
});
