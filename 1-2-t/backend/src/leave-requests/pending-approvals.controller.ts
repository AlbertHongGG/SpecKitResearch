import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../common/guards/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PendingApprovalsService } from './pending-approvals.service';

@Controller('leave-requests/pending-approvals')
export class PendingApprovalsController {
  constructor(private readonly pendingApprovals: PendingApprovalsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.manager)
  @Get()
  async list(@Req() req: Request & { user?: AuthUser }) {
    return this.pendingApprovals.listForManager(req.user!.userId);
  }
}
