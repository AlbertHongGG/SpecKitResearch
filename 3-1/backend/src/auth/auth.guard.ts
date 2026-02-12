import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes } from '../shared/http/error-codes';
import { AuthService } from './auth.service';
import type { AuthUser } from './types';

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'sid';
    const token = (req as any).cookies?.[cookieName];
    if (!token) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Not authenticated' });
    }

    const user = await this.auth.authenticate(String(token));
    if (!user) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid session' });
    }
    req.user = user;
    return true;
  }
}
