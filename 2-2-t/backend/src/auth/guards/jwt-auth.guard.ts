import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthService } from '../auth.service';

import type { CurrentUser } from '../auth.types';

type RequestWithUser = Request & { user?: CurrentUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();

    const auth = req.headers?.authorization;
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Missing bearer token.',
      });
    }

    const token = auth.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Missing bearer token.',
      });
    }

    const payload = this.authService.verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return true;
  }
}
