import { describe, expect, it } from 'vitest';

import { buildOrganizationAdminCtas } from '../../src/lib/auth/capability-map';
import type { SessionState } from '../../src/lib/auth/session-context';

function createSession(partial: Partial<SessionState>): SessionState {
  return {
    authenticated: true,
    csrfToken: 'csrf-token',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      platformRoles: [],
    },
    activeOrganizationId: 'org-1',
    organizationMemberships: [],
    projectMemberships: [],
    ...partial,
  };
}

describe('organization admin cta visibility', () => {
  it('shows member and project management links for org admins', () => {
    const actions = buildOrganizationAdminCtas(
      createSession({
        organizationMemberships: [{ organizationId: 'org-1', role: 'org_admin', status: 'active' }],
      }),
      'org-1',
    );

    expect(actions.map((action) => action.href)).toContain('/orgs/org-1/members');
    expect(actions.map((action) => action.href)).toContain('/orgs/org-1/projects');
  });

  it('adds the platform console link for platform admins', () => {
    const actions = buildOrganizationAdminCtas(
      createSession({
        user: {
          id: 'platform-admin',
          email: 'platform-admin@example.com',
          displayName: 'Platform Admin',
          platformRoles: ['platform_admin'],
        },
      }),
      'org-1',
    );

    expect(actions.map((action) => action.href)).toContain('/platform/orgs');
  });

  it('keeps elevated CTAs hidden for standard project contributors', () => {
    const actions = buildOrganizationAdminCtas(
      createSession({
        organizationMemberships: [{ organizationId: 'org-1', role: 'org_member', status: 'active' }],
        projectMemberships: [{ projectId: 'project-1', role: 'developer' }],
      }),
      'org-1',
    );

    expect(actions).toEqual([]);
  });
});
