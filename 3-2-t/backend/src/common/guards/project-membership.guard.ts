import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ERROR_CODES } from '../errors/error-codes';
import { AuthRepository } from '../../modules/auth/auth.repository';
import { GUARD_METADATA_KEYS } from './guard-pipeline';

@Injectable()
export class ProjectMembershipGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const membershipParam = this.reflector.get<string | undefined>(GUARD_METADATA_KEYS.projectParam, context.getHandler());
    if (!membershipParam) {
      return true;
    }

    const projectId = String(request.params[membershipParam] ?? '');
    const userId = request.session?.user?.id;
    if (!userId) {
      throw new NotFoundException({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: 'Project could not be found.',
      });
    }

    const membership = await this.authRepository.findProjectAccess(userId, projectId);
    if (!membership) {
      throw new NotFoundException({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: 'Project could not be found.',
      });
    }

    request.session.resourceState = {
      ...(request.session.resourceState ?? {}),
      organizationStatus: membership.project.organization.status,
      projectStatus: membership.project.status,
    };

    return true;
  }
}
