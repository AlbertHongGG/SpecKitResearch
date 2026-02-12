import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../common/prisma/prisma.service';
import { presentActivity } from '../activities/activity.presenter';

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('activities')
  @UseGuards(JwtGuard)
  async myActivities(@Req() req: Request) {
    const user = req.user as AuthUser;

    const regs = await this.prisma.registration.findMany({
      where: { userId: user.id, canceledAt: null },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return {
      items: regs.map((r) => ({
        activity: presentActivity(r.activity),
        userStatus: now.getTime() >= r.activity.date.getTime() ? 'ended' : 'upcoming',
      })),
    };
  }
}
