import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';
import { DashboardService } from './dashboard.service';

const DashboardRangeSchema = z.enum(['last_7_days', 'last_30_days']);

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async getDashboard(@Query('range') range?: string) {
    const parsed = DashboardRangeSchema.safeParse(range);
    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid range (expected last_7_days or last_30_days)',
        details: parsed.error.flatten(),
      });
    }

    return this.dashboard.getDashboard(parsed.data);
  }
}
