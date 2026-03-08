import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/db/prisma.service';

export function buildUsageEndpointFilter(endpointRaw?: string): Record<string, unknown> {
  const endpoint = endpointRaw?.trim();
  if (!endpoint) return {};

  // UUID (endpoint_id)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(endpoint)) {
    return { endpointId: endpoint };
  }

  // "METHOD /path" format.
  const methodPath = endpoint.match(/^([A-Za-z]+)\s+(\/.*)$/);
  if (methodPath) {
    const httpMethod = methodPath[1]!.toUpperCase();
    const path = methodPath[2]!;
    return { httpMethod, path };
  }

  // Backward-compatible substring search on request path.
  return { path: { contains: endpoint } };
}

@Injectable()
export class UsageLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(input: {
    userId: string;
    from: Date;
    to: Date;
    statusCode?: number;
    endpoint?: string;
  }) {
    const endpointFilter = buildUsageEndpointFilter(input.endpoint);

    return this.prisma.apiUsageLog.findMany({
      where: {
        timestamp: { gte: input.from, lte: input.to },
        ...(typeof input.statusCode === 'number' ? { statusCode: input.statusCode } : {}),
        ...endpointFilter,
        apiKey: { userId: input.userId }
      },
      orderBy: { timestamp: 'desc' },
      take: 500
    });
  }

  async findAll(input: {
    from: Date;
    to: Date;
    statusCode?: number;
    endpoint?: string;
    apiKeyId?: string;
    userId?: string;
  }) {
    const endpointFilter = buildUsageEndpointFilter(input.endpoint);

    return this.prisma.apiUsageLog.findMany({
      where: {
        timestamp: { gte: input.from, lte: input.to },
        ...(typeof input.statusCode === 'number' ? { statusCode: input.statusCode } : {}),
        ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
        ...endpointFilter,
        ...(input.userId ? { apiKey: { userId: input.userId } } : {})
      },
      orderBy: { timestamp: 'desc' },
      take: 500
    });
  }
}
