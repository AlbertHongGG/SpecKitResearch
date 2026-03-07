import { Controller, Get } from '@nestjs/common';

import { AdminAnalyticsService } from './analytics.service';

@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get()
  summary() {
    return this.service.summary();
  }
}
