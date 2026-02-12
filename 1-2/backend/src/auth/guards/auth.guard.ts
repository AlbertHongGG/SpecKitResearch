import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ACCESS_COOKIE_NAME } from '../cookies/cookie.util';
import { AuthService } from '../auth.service';

declare module 'express-serve-static-core' {
    interface Request {
        user?: { id: string; role: string };
    }
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly auth: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();

        const token = req.cookies?.[ACCESS_COOKIE_NAME];
        if (!token) {
            throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }

        const payload = await this.auth.verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role };
        return true;
    }
}
