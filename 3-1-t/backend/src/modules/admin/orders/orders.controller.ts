import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { AdminOrdersService } from './orders.service';

@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly service: AdminOrdersService) {}

  @Get()
  search(@Query('buyerId') buyerId?: string) {
    return this.service.search({ buyerId });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post(':id/force-cancel')
  forceCancel(@Param('id') id: string) {
    return this.service.forceCancel(id);
  }

  @Post(':id/force-refund')
  forceRefund(@Param('id') id: string) {
    return this.service.forceRefund(id);
  }
}
