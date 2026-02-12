import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('admin')
  async adminStats() {
    return this.service.getAdminStats();
  }
}
