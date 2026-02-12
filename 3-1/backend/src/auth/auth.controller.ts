import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { ErrorCodes } from '../shared/http/error-codes';
import { sessionCookieOptions } from './cookies';
import { AuthService } from './auth.service';
import type { AuthUser } from './types';
import { AuthGuard } from './auth.guard';

type AuthedRequest = Request & { user?: AuthUser };

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(signupSchema))
  async signup(@Body() body: z.infer<typeof signupSchema>) {
    return this.auth.signup(body.email, body.password);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: z.infer<typeof loginSchema>, @Res({ passthrough: true }) res: Response) {
    const { user, sessionToken } = await this.auth.login(body.email, body.password);
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'sid';
    res.cookie(cookieName, sessionToken, sessionCookieOptions());
    return user;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'sid';
    const token = (req as any).cookies?.[cookieName];
    if (token) {
      await this.auth.logout(String(token));
    }
    res.clearCookie(cookieName, sessionCookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthedRequest) {
    if (!req.user) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Not authenticated' });
    }
    return req.user;
  }
}
