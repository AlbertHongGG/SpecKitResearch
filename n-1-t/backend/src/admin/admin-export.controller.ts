import { Body, Controller, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { IdempotencyKeyDto } from '../registrations/dto/idempotency-key.dto';
import { AdminActivitiesService } from './admin-activities.service';

@Controller('admin/activities/:activityId/registrations/export')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminExportController {
  constructor(
    private readonly adminActivities: AdminActivitiesService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  async export(
    @Req() req: any,
    @Param('activityId') activityId: string,
    @Body() body: IdempotencyKeyDto,
    @Res() res: Response,
  ) {
    const user = req.user as AuthUser;

    const idem = await this.idempotency.tryStart({
      userId: user.id,
      scope: 'EXPORT',
      key: body?.idempotencyKey,
      ttlSeconds: 60,
    });

    const csv = await this.adminActivities.exportCsv({
      actorUserId: user.id,
      activityId,
      idempotencyKey: body?.idempotencyKey,
      shouldAudit: idem.started,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csv);
  }
}
