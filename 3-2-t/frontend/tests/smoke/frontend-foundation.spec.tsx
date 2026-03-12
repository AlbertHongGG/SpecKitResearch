import { describe, expect, it } from 'vitest';

import { resolveCapabilityMap } from '../../src/lib/auth/capability-map';

describe('frontend foundation', () => {
  it('resolves platform capability from session roles', () => {
    const result = resolveCapabilityMap({
      authenticated: true,
      csrfToken: 'token',
      user: {
        id: 'user-1',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        platformRoles: ['platform_admin'],
      },
      organizationMemberships: [],
      projectMemberships: [],
    });

    expect(result.canViewPlatformAdmin).toBe(true);
    expect(result.canManageOrganizations).toBe(true);
  });
});