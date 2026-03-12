import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ERROR_CODES } from '../errors/error-codes';
import { GUARD_METADATA_KEYS, type GuardRoleRequirement } from './guard-pipeline';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.get<GuardRoleRequirement | undefined>(GUARD_METADATA_KEYS.roleRequirement, context.getHandler());
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    const organizationParam = this.reflector.get<string | undefined>(GUARD_METADATA_KEYS.organizationParam, context.getHandler());
    const projectParam = this.reflector.get<string | undefined>(GUARD_METADATA_KEYS.projectParam, context.getHandler());
    if (!session?.user) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'The requested action requires a signed-in user.',
      });
    }

    const allowed = requirement.scope === 'platform'
      ? requirement.roles.some((role) => session.user?.platformRoles.includes(role))
      : requirement.scope === 'organization'
        ? (session.organizationMemberships ?? []).some(
            (membership) =>
              membership.organizationId === String(request.params[organizationParam ?? ''] ?? '') &&
              requirement.roles.includes(membership.role),
          )
        : (session.projectMemberships ?? []).some(
            (membership) =>
              membership.projectId === String(request.params[projectParam ?? ''] ?? '') &&
              requirement.roles.includes(membership.role),
          );

    if (!allowed) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'The requested action requires a higher role.',
      });
    }

    return true;
  }
}
