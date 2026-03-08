import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { getContext } from '../../common/request-context';
import { UsageService } from './usage.service';

@Controller('app/usage')
@UseGuards(AuthGuard, OrgGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  async getUsage(@Req() req: Request) {
    const ctx = getContext(req);
    return this.usage.getUsageOverview(ctx.org!.id);
  }
}
