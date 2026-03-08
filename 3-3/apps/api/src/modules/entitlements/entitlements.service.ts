import { Injectable } from '@nestjs/common';
import type { ForcedStatus } from '@sb/db';
import { PrismaService } from '../db/prisma.service';
import { EntitlementsCache } from './entitlements.cache';
import { computeEntitlements } from './entitlements.logic';

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: EntitlementsCache,
  ) {}

  invalidate(orgId: string): void {
    this.cache.invalidate(orgId);
  }

  async getForcedStatusForOrg(orgId: string): Promise<ForcedStatus> {
    const latest = await this.prisma.adminOverride.findFirst({
      where: { organizationId: orgId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return latest?.forcedStatus ?? 'NONE';
  }

  async computeForOrg(orgId: string) {
    return this.cache.getOrCompute(orgId, () => this.computeForOrgUncached(orgId));
  }

  private async computeForOrgUncached(orgId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId, isCurrent: true },
      include: { plan: true },
    });

    if (!sub) {
      // org exists but has no subscription (shouldn't happen in seeded flows)
      return { features: {}, limits: {}, statusReason: 'NoSubscription' as const };
    }

    const forcedStatus = await this.getForcedStatusForOrg(orgId);

    // Usage snapshot is filled by UsageService later; MVP uses zeros.
    const usage: Record<string, number> = {
      API_CALLS: 0,
      STORAGE_BYTES: 0,
      USER_COUNT: 0,
      PROJECT_COUNT: 0,
    };

    return computeEntitlements({
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        billingCycle: sub.plan.billingCycle,
        priceCents: sub.plan.priceCents,
        currency: sub.plan.currency,
        isActive: sub.plan.isActive,
        limits: (sub.plan.limits as Record<string, unknown>) ?? {},
        features: (sub.plan.features as Record<string, boolean>) ?? {},
      },
      subscriptionStatus: sub.status,
      forcedStatus,
      usage,
    });
  }
}
