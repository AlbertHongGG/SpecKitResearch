export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'project:read'
  | 'project:write'
  | 'membership:write'
  | 'board:write'
  | 'list:write'
  | 'task:write'
  | 'comment:write'
  | 'activity:read'
  | 'realtime:connect'
  | 'wip:override';

const rolePermissions: Record<ProjectRole, Set<Permission>> = {
  owner: new Set([
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
  ]),
  admin: new Set([
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
  ]),
  member: new Set([
    'project:read',
    'board:write',
    'list:write',
    'task:write',
    'comment:write',
    'activity:read',
    'realtime:connect',
  ]),
  viewer: new Set(['project:read', 'activity:read', 'realtime:connect']),
};

export function hasPermission(role: ProjectRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
