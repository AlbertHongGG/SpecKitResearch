import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireSessionGuard } from '../../guards/require-session.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';

import { UsageLogsQueryDto } from './usage-logs.dto';
import { UsageLogsRepository } from './usage-logs.repository';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('usage-logs')
@UseGuards(RequireSessionGuard)
export class UsageLogsController {
  constructor(private readonly usageLogsRepository: UsageLogsRepository) {}

  @Get()
  async list(@Query() query: UsageLogsQueryDto, @Req() request: RequestWithSession) {
    const logs = await this.usageLogsRepository.findForUser({
      userId: request.session!.userId,
      from: new Date(query.from),
      to: new Date(query.to),
      statusCode: query.status_code,
      endpoint: query.endpoint
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
