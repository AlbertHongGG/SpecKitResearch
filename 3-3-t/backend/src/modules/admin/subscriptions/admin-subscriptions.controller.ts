import { Controller, Get, Query } from '@nestjs/common';
import { AdminSubscriptionsService } from './admin-subscriptions.service';

@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly service: AdminSubscriptionsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('organizationId') organizationId?: string) {
    return this.service.list({ status, organizationId });
  }
}
