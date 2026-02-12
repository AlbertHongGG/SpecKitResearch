import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaveTypesService } from './leave-types.service';

@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    const items = await this.leaveTypesService.listActive();
    return items.map((lt) => ({
      id: lt.id,
      name: lt.name,
      annual_quota: lt.annualQuota,
      carry_over: lt.carryOver,
      require_attachment: lt.requireAttachment,
      is_active: lt.isActive,
    }));
  }
}
