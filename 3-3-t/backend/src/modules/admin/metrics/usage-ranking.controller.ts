import { Controller, Get, Query } from '@nestjs/common';
import { UsageRankingService } from './usage-ranking.service';

@Controller('admin/metrics/usage')
export class UsageRankingController {
  constructor(private readonly service: UsageRankingService) {}

  @Get()
  get(@Query('meterCode') meterCode?: string) {
    return this.service.rank(meterCode);
  }
}
