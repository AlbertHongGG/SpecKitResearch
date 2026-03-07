import { Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { SellerOrdersService } from './orders.service';

@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly service: SellerOrdersService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserType | undefined) {
    return this.service.list(user);
  }

  @Get(':subOrderId')
  async detail(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('subOrderId') subOrderId: string,
  ) {
    return this.service.detail(user, subOrderId);
  }

  @Post(':subOrderId/ship')
  async ship(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('subOrderId') subOrderId: string,
  ) {
    return this.service.ship(user, subOrderId);
  }
}
