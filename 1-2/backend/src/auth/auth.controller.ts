import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    XSRF_COOKIE_NAME,
    getAccessCookieOptions,
    getRefreshCookieOptions,
} from './cookies/cookie.util';
import { AuthLoginRequestDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { CsrfGuard } from './csrf/csrf.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @UseGuards(CsrfGuard)
    @HttpCode(200)
    @Post('login')
    async login(
        @Body() body: AuthLoginRequestDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.auth.login(body.email, body.password);

        res.cookie(
            ACCESS_COOKIE_NAME,
            result.tokens.accessToken,
            getAccessCookieOptions(result.tokens.accessMaxAgeMs),
        );
        res.cookie(
            REFRESH_COOKIE_NAME,
            result.tokens.refreshToken,
            getRefreshCookieOptions(result.tokens.refreshMaxAgeMs),
        );

        return { user: result.user };
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Req() req: Request) {
        const userId = (req as any).user?.id as string;
        const user = await this.auth.getMe(userId);
        return { user };
    }

    @HttpCode(200)
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
        if (!refreshToken) {
            await this.clearAuthCookies(res);
            return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }

        const result = await this.auth.refresh(refreshToken);

        res.cookie(ACCESS_COOKIE_NAME, result.accessToken, getAccessCookieOptions(result.accessMaxAgeMs));
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions(result.refreshMaxAgeMs));

        return { ok: true };
    }

    @HttpCode(200)
    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
        await this.auth.logout(refreshToken);
        await this.clearAuthCookies(res);
        return { ok: true };
    }

    private async clearAuthCookies(res: Response) {
        res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
        res.clearCookie(XSRF_COOKIE_NAME, { path: '/' });
    }
}
