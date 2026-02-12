import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import type { AuthUser } from '../auth/auth.types';
import { presentUser } from './user.presenter';
import type { Request } from 'express';

@Controller()
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@Req() req: Request) {
    const authUser = req.user as AuthUser | undefined;
    if (!authUser) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_REQUIRED,
        message: 'Authentication required',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_REQUIRED,
        message: 'Authentication required',
      });
    }

    return presentUser(user);
  }
}
