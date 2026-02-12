import type { FastifyReply, FastifyRequest } from 'fastify';
import { findMembership } from '../../repos/membership-repo';
import { findProjectById } from '../../repos/project-repo';
import { hasPermission, type Permission, type ProjectRole } from '../../domain/rbac/roles';
import { hideResourceExistence } from './not-found-policy';
import { forbidden } from './not-found-policy';

declare module 'fastify' {
  interface FastifyRequest {
    project?: { id: string; status: 'active' | 'archived' };
    membership?: { role: 'owner' | 'admin' | 'member' | 'viewer' };
  }
}

export async function projectScope(req: FastifyRequest, _reply: FastifyReply) {
  const projectId = (req.params as any).projectId as string | undefined;
  const userId = req.user?.id;

  if (!projectId || !userId) {
    hideResourceExistence();
  }

  const [project, membership] = await Promise.all([
    findProjectById(req.server.prisma, projectId),
    findMembership(req.server.prisma, projectId, userId),
  ]);

  // Hide existence if either project doesn't exist or user isn't a member.
  if (!project || !membership) {
    hideResourceExistence();
  }

  req.project = { id: project.id, status: project.status };
  req.membership = { role: membership.role };
}

export function projectScopeWithPermission(permission: Permission) {
  return async function scoped(req: FastifyRequest, reply: FastifyReply) {
    await projectScope(req, reply);
    const role = req.membership!.role as ProjectRole;
    if (!hasPermission(role, permission)) {
      forbidden();
    }
  };
}
