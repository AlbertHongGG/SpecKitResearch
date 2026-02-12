import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { LeaveBalanceService } from './leave-balance.service';

@Controller('leave-balance')
export class LeaveBalanceController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBalance(
    @Req() req: Request & { user?: AuthUser },
    @Query('year') year?: string,
  ) {
    const y = year ? Number(year) : new Date().getUTCFullYear();
    const items = await this.leaveBalanceService.getBalanceItems(
      req.user!.userId,
      y,
    );
    return items;
  }
}
