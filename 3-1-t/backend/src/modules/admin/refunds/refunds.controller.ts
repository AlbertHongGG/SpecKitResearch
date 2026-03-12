import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { AdminRefundsService } from './refunds.service';

@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly service: AdminRefundsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: { approvedCents?: number }) {
    return this.service.approve(id, body.approvedCents);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @Post(':id/force-refund')
  forceRefund(
    @Param('id') id: string,
    @Body() body: { approvedCents?: number },
  ) {
    return this.service.forceRefund(id, body.approvedCents);
  }
}
