import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

type MeterCode = 'API_CALLS' | 'STORAGE_BYTES' | 'USER_COUNT' | 'PROJECT_COUNT';

const METER_META: Record<MeterCode, { name: string; unit: string; valueField: 'sumValue' | 'maxValue' | 'lastValue' }> = {
  API_CALLS: { name: 'API Calls', unit: 'calls', valueField: 'sumValue' },
  STORAGE_BYTES: { name: 'Storage', unit: 'bytes', valueField: 'maxValue' },
  USER_COUNT: { name: 'Users', unit: 'count', valueField: 'maxValue' },
  PROJECT_COUNT: { name: 'Projects', unit: 'count', valueField: 'maxValue' },
};

function computeStatus(value: number, limit: number | null): 'ok' | 'nearLimit' | 'overLimit' {
  if (!limit || limit <= 0) return 'ok';
  if (value > limit) return 'overLimit';
  if (value >= Math.ceil(limit * 0.8)) return 'nearLimit';
  return 'ok';
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageOverview(orgId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId, isCurrent: true },
      select: {
        id: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        plan: { select: { limits: true } },
      },
    });

    const now = new Date();
    const resetAt = sub?.currentPeriodEnd ?? now;
    const periodStart = sub?.currentPeriodStart;

    const planLimits = (sub?.plan.limits ?? {}) as Record<string, unknown>;

    const rollups =
      sub && periodStart
        ? await this.prisma.usageRollup.findMany({
            where: {
              organizationId: orgId,
              subscriptionId: sub.id,
              periodStart,
              meterCode: { in: Object.keys(METER_META) as MeterCode[] },
            },
          })
        : [];
    const rollupByCode = new Map<MeterCode, (typeof rollups)[number]>();
    for (const r of rollups) {
      rollupByCode.set(r.meterCode as MeterCode, r);
    }

    // Derived meters (gauge/peak) from DB state.
    if (sub && periodStart) {
      const activeMemberCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      });

      const existing = rollupByCode.get('USER_COUNT');
      const nextMax = Math.max(existing?.maxValue ?? 0, activeMemberCount);

      const updated = await this.prisma.usageRollup.upsert({
        where: {
          organizationId_subscriptionId_meterCode_periodStart: {
            organizationId: orgId,
            subscriptionId: sub.id,
            meterCode: 'USER_COUNT',
            periodStart,
          },
        },
        create: {
          organizationId: orgId,
          subscriptionId: sub.id,
          meterCode: 'USER_COUNT',
          periodStart,
          periodEnd: sub.currentPeriodEnd,
          sumValue: 0,
          maxValue: activeMemberCount,
          lastValue: activeMemberCount,
        },
        update: {
          periodEnd: sub.currentPeriodEnd,
          maxValue: nextMax,
          lastValue: activeMemberCount,
        },
      });
      rollupByCode.set('USER_COUNT', updated);
    }

    return {
      meters: (Object.keys(METER_META) as MeterCode[]).map((code) => {
        const meta = METER_META[code];
        const rollup = rollupByCode.get(code);

        const value = rollup ? Number((rollup as any)[meta.valueField] ?? 0) : 0;

        const limitObj = planLimits[code] as any;
        const limit = typeof limitObj?.limit === 'number' ? (limitObj.limit as number) : null;
        const policy = limitObj?.policy === 'block' || limitObj?.policy === 'throttle' || limitObj?.policy === 'overage' ? limitObj.policy : 'block';

        return {
          code,
          name: meta.name,
          unit: meta.unit,
          value,
          limit,
          policy,
          status: computeStatus(value, limit),
          resetAt,
        };
      }),
    };
  }
}
