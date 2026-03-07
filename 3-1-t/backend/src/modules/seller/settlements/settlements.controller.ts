import { Controller, Get, Param } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { SellerSettlementsService } from './settlements.service';

@Controller('seller/settlements')
export class SellerSettlementsController {
  constructor(private readonly service: SellerSettlementsService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserType | undefined) {
    return this.service.list(user);
  }

  @Get(':settlementId')
  async detail(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('settlementId') settlementId: string,
  ) {
    return this.service.detail(user, settlementId);
  }
}
