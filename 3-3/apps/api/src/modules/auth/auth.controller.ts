import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../db/prisma.service';
import { AppError } from '../../common/app-error';
import { issueCsrfCookie } from '../../middleware/csrf.middleware';
import { AuthService, loginSchema, signUpSchema } from './auth.service';
import { SessionService, SESSION_COOKIE } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('signup')
  async signUp(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({
        errorCode: 'VALIDATION_ERROR',
        status: 400,
        message: parsed.error.message,
      });
    }

    const { user, org } = await this.auth.signUp(parsed.data);
    const session = await this.sessions.createSession({ userId: user.id });
    this.sessions.setSessionCookie(res, session.id, session.expiresAt);
    issueCsrfCookie(res);

    const organizations = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { organization: true },
    });

    return {
      user: { id: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
      session: { expiresAt: session.expiresAt.toISOString() },
      organizations: organizations.map((m) => ({
        id: m.organizationId,
        name: m.organization.name,
        memberRole: m.role,
      })),
      currentOrganization: { id: org.id, name: org.name, memberRole: 'ORG_ADMIN' },
    };
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const user = await this.auth.login(parsed.data);
    const session = await this.sessions.createSession({ userId: user.id });
    this.sessions.setSessionCookie(res, session.id, session.expiresAt);
    issueCsrfCookie(res);

    const orgs = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { organization: true },
    });

    return {
      user: { id: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
      session: { expiresAt: session.expiresAt.toISOString() },
      organizations: orgs.map((m) => ({ id: m.organizationId, name: m.organization.name, memberRole: m.role })),
      currentOrganization:
        orgs.length > 0
          ? { id: orgs[0].organizationId, name: orgs[0].organization.name, memberRole: orgs[0].role }
          : null,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const sessionId = res.req?.cookies?.[SESSION_COOKIE];
    if (sessionId) {
      await this.sessions.deleteSession(sessionId);
    }
    this.sessions.clearSessionCookie(res);
    return;
  }
}
