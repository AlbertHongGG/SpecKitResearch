import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ERROR_CODES } from '../errors/error-codes';
import { GUARD_METADATA_KEYS } from './guard-pipeline';

@Injectable()
export class ReadOnlyPolicyGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const writesBlocked = this.reflector.get<boolean>(GUARD_METADATA_KEYS.enforceReadOnly, context.getHandler()) ?? false;
    if (!writesBlocked) {
      return true;
    }

    const organizationStatus = request.session?.resourceState?.organizationStatus;
    if (organizationStatus === 'suspended') {
      throw new ForbiddenException({
        code: ERROR_CODES.ORG_SUSPENDED,
        message: 'This organization is suspended and currently read-only.',
      });
    }

    const projectStatus = request.session?.resourceState?.projectStatus;
    if (projectStatus === 'archived') {
      throw new ForbiddenException({
        code: ERROR_CODES.PROJECT_ARCHIVED,
        message: 'This project is archived and currently read-only.',
      });
    }

    return true;
  }
}
