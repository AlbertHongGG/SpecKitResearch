import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Permission } from '../../domain/rbac/roles';
import { hasPermission } from '../../domain/rbac/roles';
import { forbidden } from './not-found-policy';

export function requirePermission(permission: Permission) {
  return async function requirePermissionHook(req: FastifyRequest, _reply: FastifyReply) {
    const role = req.membership?.role;
    if (!role) forbidden();
    if (!hasPermission(role, permission)) forbidden();
  };
}
