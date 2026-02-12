import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { XSRF_COOKIE_NAME } from '../cookies/cookie.util';
import { getEnv } from '../../common/config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();

        if (SAFE_METHODS.has(req.method)) return true;

        const env = getEnv();

        const origin = req.headers.origin;
        if (origin && origin !== env.APP_ORIGIN) {
            throw new ForbiddenException({ code: 'CSRF_INVALID', message: 'Invalid origin' });
        }

        const fetchSite = req.headers['sec-fetch-site'];
        if (fetchSite === 'cross-site') {
            throw new ForbiddenException({ code: 'CSRF_INVALID', message: 'Cross-site request blocked' });
        }

        const csrfHeader = req.headers['x-csrf-token'];
        const csrfToken = typeof csrfHeader === 'string' ? csrfHeader : undefined;
        const cookieToken = (req.cookies as any)?.[XSRF_COOKIE_NAME] as string | undefined;

        if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
            throw new ForbiddenException({ code: 'CSRF_INVALID', message: 'Invalid CSRF token' });
        }

        return true;
    }
}
