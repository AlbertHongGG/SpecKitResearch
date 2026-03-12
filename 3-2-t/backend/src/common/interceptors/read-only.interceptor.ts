import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

import { ERROR_CODES } from '../errors/error-codes';
import { GUARD_METADATA_KEYS } from '../guards/guard-pipeline';

@Injectable()
export class ReadOnlyInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const writesBlocked = this.reflector.get<boolean>(GUARD_METADATA_KEYS.enforceReadOnly, context.getHandler()) ?? false;
    if (!writesBlocked) {
      return next.handle();
    }

    const organizationStatus = request.session?.resourceState?.organizationStatus;
    if (organizationStatus === 'suspended') {
      throw new ForbiddenException({
        code: ERROR_CODES.ORG_SUSPENDED,
        message: 'Organization is suspended (read-only).',
      });
    }

    const projectStatus = request.session?.resourceState?.projectStatus;
    if (projectStatus === 'archived') {
      throw new ForbiddenException({
        code: ERROR_CODES.PROJECT_ARCHIVED,
        message: 'Project is archived (read-only).',
      });
    }

    return next.handle();
  }
}
