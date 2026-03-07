import { Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { orderIdParamSchema, subOrderParamsSchema } from './orders.schemas';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserType | undefined) {
    return this.ordersService.list(user);
  }

  @Get(':id')
  async getOrder(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param() rawParams: unknown,
  ) {
    const { id } = orderIdParamSchema.parse(rawParams);
    return this.ordersService.getOrder(user, id);
  }

  @Get(':id/suborders/:subOrderId')
  async getSubOrder(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param() rawParams: unknown,
  ) {
    const { id, subOrderId } = subOrderParamsSchema.parse(rawParams);
    return this.ordersService.getSubOrder(user, id, subOrderId);
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param() rawParams: unknown,
  ) {
    const { id } = orderIdParamSchema.parse(rawParams);
    return this.ordersService.cancelBeforePayment(user, id);
  }
}
