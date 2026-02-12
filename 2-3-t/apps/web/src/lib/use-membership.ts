'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from './api-client';
import { useMe } from './require-auth';

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

const rolePermissions: Record<ProjectRole, ReadonlySet<Permission>> = {
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

export function hasPermission(role: ProjectRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role].has(permission);
}

export type ProjectMembership = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  version: number;
  joinedAt: string;
};

type ListMembershipsResponse = {
  memberships: ProjectMembership[];
};

export function useProjectMemberships(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['projects', projectId, 'memberships'],
    enabled,
    queryFn: async () => {
      const res = await apiFetch<ListMembershipsResponse>(`/projects/${projectId}/memberships`, { method: 'GET' });
      return res.data as ListMembershipsResponse;
    },
  });
}

export function useMyMembership(projectId: string) {
  const me = useMe();
  const memberships = useProjectMemberships(projectId, !!me.data?.user);

  const my = useMemo(() => {
    const userId = me.data?.user.id;
    if (!userId) return null;
    const list = memberships.data?.memberships ?? [];
    return list.find((m) => m.userId === userId) ?? null;
  }, [me.data?.user.id, memberships.data?.memberships]);

  const role = my?.role ?? null;

  const isProjectAccessError = memberships.error instanceof ApiError && (memberships.error.statusCode === 403 || memberships.error.statusCode === 404);

  return {
    me,
    memberships,
    myMembership: my,
    role,
    can: {
      projectWrite: hasPermission(role, 'project:write'),
      membershipWrite: hasPermission(role, 'membership:write'),
      projectRead: hasPermission(role, 'project:read'),
    },
    isProjectAccessError,
  };
}
