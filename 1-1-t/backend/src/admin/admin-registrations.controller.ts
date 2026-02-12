import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Readable } from 'stream';
import { JwtGuard } from '../auth/jwt.guard';
import type { AuthUser } from '../auth/auth.types';
import { RolesRequired } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminRegistrationsService } from './admin-registrations.service';

function csvEscape(value: string) {
  if (/[\n\r",]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Controller('admin/activities')
@UseGuards(JwtGuard, RolesGuard)
@RolesRequired(Role.admin)
export class AdminRegistrationsController {
  constructor(private readonly service: AdminRegistrationsService) {}

  @Get(':activityId/registrations')
  async list(
    @Param('activityId') activityId: string,
    @Query('includeCancelled', new DefaultValuePipe(false), ParseBoolPipe)
    includeCancelled: boolean,
  ) {
    return this.service.list({ activityId, includeCancelled });
  }

  @Get(':activityId/registrations.csv')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Param('activityId') activityId: string,
  ) {
    const user = req.user as AuthUser;
    const items = await this.service.exportCsv({
      actorUserId: user.id,
      activityId,
    });

    const header = ['userId', 'name', 'email', 'registeredAt', 'canceledAt'].join(',');
    const rows = items.map((x) =>
      [
        x.userId,
        x.name,
        x.email,
        x.registeredAt,
        x.canceledAt ?? '',
      ]
        .map((v) => csvEscape(String(v)))
        .join(','),
    );

    const csvBody = [header, ...rows].join('\n');
    const withBom = `\uFEFF${csvBody}`;

    res.status(200);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${activityId}.csv"`);

    Readable.from([withBom]).pipe(res);
  }
}
