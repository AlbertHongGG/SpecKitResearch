import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { parseDateTime } from '../common/time/time';
import { ActivitiesService } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async list(@Req() req: Request, @Query('from') from?: string) {
    const user = req.user as AuthUser | undefined;
    return this.activities.listVisible({
      userId: user?.id ?? null,
      from: from ? parseDateTime(from) : undefined,
    });
  }

  @Get(':activityId')
  @UseGuards(OptionalJwtGuard)
  async detail(@Req() req: Request, @Param('activityId') activityId: string) {
    const user = req.user as AuthUser | undefined;
    return this.activities.getVisibleDetail({
      activityId,
      userId: user?.id ?? null,
    });
  }
}
