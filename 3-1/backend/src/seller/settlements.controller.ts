import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/types';
import { SettlementService } from './settlement.service';
import { ErrorCodes } from '../shared/http/error-codes';

type AuthedRequest = Request & { user?: AuthUser };

@Controller('seller/settlements')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller')
export class SettlementsController {
  constructor(private readonly settlements: SettlementService) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    const items = await this.settlements.listMySettlements(req.user!.id);
    return { items };
  }

  @Get(':settlementId')
  async detail(@Req() req: AuthedRequest, @Param('settlementId') settlementId: string) {
    const settlement = await this.settlements.getMySettlement(req.user!.id, settlementId);
    if (!settlement) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Settlement not found' });
    return { settlement };
  }
}
