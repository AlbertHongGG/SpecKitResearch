import { Controller, Get, Req } from '@nestjs/common';
import { UsageRecordsRepository } from './usage-records.repository';
import { UsageMeterService } from './usage-meter.service';

@Controller('usage')
export class UsageController {
  constructor(
    private readonly usageRepository: UsageRecordsRepository,
    private readonly meterService: UsageMeterService,
  ) {}

  @Get()
  async list(@Req() req: any) {
    const rows = await this.usageRepository.listByOrg(req.orgId);
    const grouped = Object.entries(this.meterService.defaultLimits).map(([meterCode, limit]) => {
      const record = rows.find((r) => r.meterCode === meterCode);
      return {
        meterCode,
        value: record?.value ?? 0,
        limit,
        strategy: this.meterService.defaultStrategies[meterCode as keyof typeof this.meterService.defaultStrategies],
      };
    });

    return {
      periodStart: rows[0]?.periodStart ?? new Date(),
      periodEnd: rows[0]?.periodEnd ?? new Date(),
      meters: grouped,
    };
  }
}
