import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { getXsrfCookieOptions, XSRF_COOKIE_NAME } from '../cookies/cookie.util';

@Controller('auth/csrf')
export class CsrfController {
    @Get()
    issue(@Res({ passthrough: true }) res: Response) {
        const token = randomBytes(32).toString('base64url');
        res.cookie(XSRF_COOKIE_NAME, token, getXsrfCookieOptions(2 * 60 * 60 * 1000));
        return { token };
    }
}
