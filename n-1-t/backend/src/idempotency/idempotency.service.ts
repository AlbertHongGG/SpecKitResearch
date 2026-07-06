import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { utcNow } from '../common/time/time';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async tryStart(params: {
    userId: string;
    scope: string;
    key: string | undefined;
    ttlSeconds: number;
    requestHash?: string;
  }): Promise<{ started: boolean }>
  {
    if (!params.key) return { started: true };

    const now = utcNow();
    const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          userId: params.userId,
          scope: params.scope,
          key: params.key,
          requestHash: params.requestHash,
          expiresAt,
        },
      });
      return { started: true };
    } catch (err: any) {
      // unique violation
      const existing = await this.prisma.idempotencyRecord.findUnique({
        where: { userId_scope_key: { userId: params.userId, scope: params.scope, key: params.key } },
      });

      if (!existing) return { started: true };

      if (existing.expiresAt.getTime() <= now.getTime()) {
        await this.prisma.idempotencyRecord.delete({ where: { id: existing.id } });
        await this.prisma.idempotencyRecord.create({
          data: {
            userId: params.userId,
            scope: params.scope,
            key: params.key,
            requestHash: params.requestHash,
            expiresAt,
          },
        });
        return { started: true };
      }

      return { started: false };
    }
  }
}
