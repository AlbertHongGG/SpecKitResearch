import { describe, expect, it } from 'vitest';

import { buildNavigationLinks } from '../../src/components/navigation/app-navigation';
import type { SessionState } from '../../src/lib/auth/session-context';

function createSession(partial: Partial<SessionState>): SessionState {
  return {
    authenticated: false,
    csrfToken: null,
    user: null,
    activeOrganizationId: null,
    organizationMemberships: [],
    projectMemberships: [],
    ...partial,
  };
}

describe('navigation visibility', () => {
  it('shows organization navigation for authenticated users', () => {
    const links = buildNavigationLinks(
      createSession({
        authenticated: true,
        user: {
          id: 'user-1',
          email: 'developer@example.com',
          displayName: 'Developer',
          platformRoles: [],
        },
      }),
    );

    expect(links.some((link) => link.href === '/orgs')).toBe(true);
    expect(links.some((link) => link.href === '/platform/orgs')).toBe(false);
  });

  it('shows platform admin navigation for platform admins', () => {
    const links = buildNavigationLinks(
      createSession({
        authenticated: true,
        user: {
          id: 'user-2',
          email: 'platform-admin@example.com',
          displayName: 'Platform Admin',
          platformRoles: ['platform_admin'],
        },
      }),
    );

    expect(links.some((link) => link.href === '/platform/orgs')).toBe(true);
  });
});
