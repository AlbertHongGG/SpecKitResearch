import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { ApiKeyPrincipal, ResolvedEndpoint } from '../shared/auth/auth.types';
import { ScopeAuthorizationService } from '../shared/auth/scope-authorization.service';

type RequestWithAuthContext = FastifyRequest & {
  apiKey?: ApiKeyPrincipal;
  resolvedEndpoint?: ResolvedEndpoint;
};

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly scopeAuthorizationService: ScopeAuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();

    if (!request.apiKey) {
      throw new UnauthorizedException();
    }

    if (!request.resolvedEndpoint) {
      throw new ForbiddenException();
    }

    const allowed = await this.scopeAuthorizationService.isAllowed(
      request.resolvedEndpoint.endpointId,
      request.apiKey.scopes
    );

    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }
}
