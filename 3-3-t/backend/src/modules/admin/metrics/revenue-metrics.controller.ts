import { Controller, Get } from '@nestjs/common';
import { RevenueMetricsService } from './revenue-metrics.service';

@Controller('admin/metrics/revenue')
export class RevenueMetricsController {
  constructor(private readonly service: RevenueMetricsService) {}

  @Get()
  get() {
    return this.service.getMetrics();
  }
}
