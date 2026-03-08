import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { RequireAdminGuard } from '../../guards/require-admin.guard';

import { UsageLogsRepository } from './usage-logs.repository';
import { AdminUsageLogsQueryDto } from './usage-logs.admin.dto';

@Controller('admin/usage-logs')
@UseGuards(RequireAdminGuard)
export class UsageLogsAdminController {
  constructor(private readonly usageLogsRepository: UsageLogsRepository) {}

  @Get()
  async list(@Query() query: AdminUsageLogsQueryDto) {
    const logs = await this.usageLogsRepository.findAll({
      from: new Date(query.from),
      to: new Date(query.to),
      statusCode: query.status_code,
      endpoint: query.endpoint,
      apiKeyId: query.api_key_id,
      userId: query.user_id
    });

    return logs.map((l) => ({
      api_key_id: l.apiKeyId,
      endpoint_id: l.endpointId ?? null,
      http_method: l.httpMethod,
      path: l.path,
      status_code: l.statusCode,
      response_time_ms: l.responseTimeMs,
      timestamp: l.timestamp.toISOString()
    }));
  }
}
