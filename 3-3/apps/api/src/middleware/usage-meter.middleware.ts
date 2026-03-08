import { Injectable, Logger, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import type { Request } from 'express';
import { finalize } from 'rxjs/operators';
import { withSqliteRetry } from '../common/db/retry';
import { getContext } from '../common/request-context';
import { PrismaService } from '../modules/db/prisma.service';

@Injectable()
export class UsageMeterInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageMeterInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    return next.handle().pipe(
      finalize(() => {
        const path = typeof req.path === 'string' ? req.path : '';
        if (!path.startsWith('/app/')) return;

        let ctx: ReturnType<typeof getContext> | null = null;
        try {
          ctx = getContext(req);
        } catch {
          return;
        }

        if (!ctx.user || !ctx.org) return;

        const occurredAt = new Date();
        const idempotencyKey = `api-call:${ctx.requestId}`;

        void withSqliteRetry(async () => {
          const sub = await this.prisma.subscription.findFirst({
            where: { organizationId: ctx!.org!.id, isCurrent: true },
            select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
          });
          if (!sub) return;

          await this.prisma.$transaction(async (tx) => {
            try {
              await tx.usageEvent.create({
                data: {
                  organizationId: ctx!.org!.id,
                  subscriptionId: sub.id,
                  meterCode: 'API_CALLS',
                  occurredAt,
                  periodStart: sub.currentPeriodStart,
                  delta: 1,
                  value: null,
                  idempotencyKey,
                  metadata: {
                    method: req.method,
                    path,
                    statusCode: (req as any).res?.statusCode,
                  },
                },
              });
            } catch (error: any) {
              // idempotency: ignore duplicates
              if (error?.code !== 'P2002') throw error;
            }

            await tx.usageRollup.upsert({
              where: {
                organizationId_subscriptionId_meterCode_periodStart: {
                  organizationId: ctx!.org!.id,
                  subscriptionId: sub.id,
                  meterCode: 'API_CALLS',
                  periodStart: sub.currentPeriodStart,
                },
              },
              create: {
                organizationId: ctx!.org!.id,
                subscriptionId: sub.id,
                meterCode: 'API_CALLS',
                periodStart: sub.currentPeriodStart,
                periodEnd: sub.currentPeriodEnd,
                sumValue: 1,
                maxValue: 1,
                lastValue: 1,
              },
              update: {
                periodEnd: sub.currentPeriodEnd,
                sumValue: { increment: 1 },
                lastValue: { increment: 1 },
                maxValue: { increment: 1 },
              },
            });
          });
        }).catch((error) => {
          this.logger.warn(`usage metering failed: ${String(error?.message ?? error)}`);
        });
      }),
    );
  }
}
