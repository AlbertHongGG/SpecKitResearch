import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequireOrgRole } from '../../guards/rbac.decorator';
import { PrismaService } from '../db/prisma.service';

const injectSchema = z.object({
  meterCode: z.enum(['API_CALLS', 'STORAGE_BYTES', 'USER_COUNT', 'PROJECT_COUNT']),
  value: z.number().int().min(0),
});

/**
 * Dev/test only endpoint to manipulate usage rollups for demos.
 * Not part of the public OpenAPI contract.
 */
@Controller('app/usage/dev')
@UseGuards(AuthGuard, OrgGuard, RbacGuard)
@RequireOrgRole('ORG_ADMIN')
export class UsageDevController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('inject')
  async inject(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = injectSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: ctx.org!.id, isCurrent: true },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    if (!sub) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Subscription not found' });
    }

    await this.prisma.usageRollup.upsert({
      where: {
        organizationId_subscriptionId_meterCode_periodStart: {
          organizationId: ctx.org!.id,
          subscriptionId: sub.id,
          meterCode: parsed.data.meterCode,
          periodStart: sub.currentPeriodStart,
        },
      },
      create: {
        organizationId: ctx.org!.id,
        subscriptionId: sub.id,
        meterCode: parsed.data.meterCode,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        sumValue: parsed.data.value,
        maxValue: parsed.data.value,
        lastValue: parsed.data.value,
      },
      update: {
        periodEnd: sub.currentPeriodEnd,
        sumValue: parsed.data.value,
        maxValue: parsed.data.value,
        lastValue: parsed.data.value,
      },
    });

    return { ok: true };
  }
}
