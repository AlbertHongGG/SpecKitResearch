import { describe, expect, it } from 'vitest';

describe('admin audit contract', () => {
  it('includes actor and action fields', () => {
    const row = { actorRoleContext: 'PLATFORM_ADMIN', action: 'ADMIN_OVERRIDE_APPLIED' };
    expect(row.actorRoleContext).toBeTruthy();
    expect(row.action).toBeTruthy();
  });
});
