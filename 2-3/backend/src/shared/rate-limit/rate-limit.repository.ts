import { Injectable } from '@nestjs/common';

import { PrismaService } from '../db/prisma.service';
import type { RateLimitWindow } from './rate-limit.types';

function bucketId(params: {
  apiKeyId: string;
  endpointId?: string;
  window: RateLimitWindow;
  startTs: Date;
}): string {
  const endpointPart = params.endpointId ?? 'all';
  return `rl:${params.apiKeyId}:${endpointPart}:${params.window}:${params.startTs.toISOString()}`;
}

@Injectable()
export class RateLimitBucketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async incrementAndGetCount(params: {
    apiKeyId: string;
    endpointId?: string;
    window: RateLimitWindow;
    startTs: Date;
  }): Promise<number> {
    const id = bucketId(params);

    const row = await this.prisma.rateLimitBucket.upsert({
      where: { id },
      create: {
        id,
        apiKeyId: params.apiKeyId,
        endpointId: params.endpointId,
        window: params.window,
        startTs: params.startTs,
        count: 1
      },
      update: {
        count: { increment: 1 }
      },
      select: { count: true }
    });

    return row.count;
  }
}
