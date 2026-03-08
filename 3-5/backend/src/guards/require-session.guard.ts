import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { SessionService } from '../shared/auth/session.service';
import type { SessionPrincipal } from '../shared/auth/auth.types';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Injectable()
export class RequireSessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();

    const principal = await this.sessionService.getSessionPrincipalFromRequest(request);
    if (!principal) {
      throw new UnauthorizedException();
    }

    request.session = principal;
    return true;
  }
}
