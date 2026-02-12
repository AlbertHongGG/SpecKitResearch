import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../common/guards/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DepartmentCalendarService } from './department-calendar.service';

@Controller('department-calendar')
export class DepartmentCalendarController {
  constructor(private readonly calendar: DepartmentCalendarService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.manager)
  @Get()
  async get(
    @Req() req: Request & { user?: AuthUser },
    @Query('month') month: string,
    @Query('includeSubmitted') includeSubmitted?: string,
  ) {
    const include = includeSubmitted === 'true' || includeSubmitted === '1';
    return this.calendar.getForManager(req.user!.userId, month, include);
  }
}
