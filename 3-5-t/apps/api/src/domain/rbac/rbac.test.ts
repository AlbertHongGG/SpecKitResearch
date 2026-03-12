import { describe, expect, it } from 'vitest';
import { hasPermission, type Permission, type ProjectRole } from './roles';

const all: Permission[] = [
  'project:read',
  'project:write',
  'membership:write',
  'board:write',
  'list:write',
  'task:write',
  'comment:write',
  'activity:read',
  'realtime:connect',
  'wip:override',
];

describe('rbac permissions', () => {
  it('owner has all permissions', () => {
    for (const p of all) {
      expect(hasPermission('owner', p)).toBe(true);
    }
  });

  it('admin has all permissions except none', () => {
    for (const p of all) {
      expect(hasPermission('admin', p)).toBe(true);
    }
  });

  it('member does not have membership:write or project:write', () => {
    expect(hasPermission('member', 'project:read')).toBe(true);
    expect(hasPermission('member', 'project:write')).toBe(false);
    expect(hasPermission('member', 'membership:write')).toBe(false);
  });

  it('viewer is read-only', () => {
    const role: ProjectRole = 'viewer';
    expect(hasPermission(role, 'project:read')).toBe(true);
    expect(hasPermission(role, 'activity:read')).toBe(true);
    expect(hasPermission(role, 'realtime:connect')).toBe(true);
    expect(hasPermission(role, 'task:write')).toBe(false);
  });
});
