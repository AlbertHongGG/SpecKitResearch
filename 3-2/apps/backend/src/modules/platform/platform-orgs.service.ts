import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { AuditService } from '../audit/audit.service.js';
import {
  auditOrgSuspended,
  auditOrgUnsuspended,
  auditPlatformOrgCreated,
  auditPlatformOrgUpdated,
} from './platform.audit.js';

@Injectable()
export class PlatformOrgsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private normalizeLimit(limit: unknown) {
    const n = typeof limit === 'string' ? Number(limit) : typeof limit === 'number' ? limit : 50;
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(100, Math.floor(n));
  }

  async listOrgs(params: { limit?: string; cursor?: string | undefined }) {
    const take = this.normalizeLimit(params.limit);

    const rows = await this.prisma.organization.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(params.cursor
        ? {
            cursor: { id: params.cursor },
            skip: 1,
          }
        : {}),
      select: { id: true, name: true, status: true, plan: true },
    });

    const nextCursor = rows.length > take ? rows[rows.length - 1]!.id : null;
    const page = rows.slice(0, take);

    return {
      organizations: page.map((o) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        plan: o.plan,
        // Contract reuses OrganizationSummary which includes roleInOrg.
        // Platform admins are not automatically org members, but the UI only needs a value.
        roleInOrg: 'org_admin' as const,
      })),
      nextCursor,
    };
  }

  async createOrg(params: {
    actor: { userId: string; email: string; platformRole?: string | null };
    name: string;
    plan: 'free' | 'paid';
  }) {
    if (params.actor.platformRole !== 'platform_admin') {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Platform admin role required' });
    }

    const org = await this.prisma.organization.create({
      data: {
        name: params.name,
        plan: params.plan,
        status: 'active',
        createdByUserId: params.actor.userId,
        memberships: {
          create: {
            userId: params.actor.userId,
            orgRole: 'org_admin',
            status: 'active',
          },
        },
      },
    });

    await auditPlatformOrgCreated({
      audit: this.audit,
      actor: { userId: params.actor.userId, email: params.actor.email },
      org,
    });

    return org;
  }

  async updateOrg(params: {
    actor: { userId: string; email: string; platformRole?: string | null };
    orgId: string;
    patch: { name?: string; plan?: 'free' | 'paid'; status?: 'active' | 'suspended' };
  }) {
    if (params.actor.platformRole !== 'platform_admin') {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Platform admin role required' });
    }

    const existing = await this.prisma.organization.findUnique({
      where: { id: params.orgId },
      select: { id: true, name: true, plan: true, status: true },
    });

    if (!existing) {
      throwNotFound();
    }

    const before = { ...existing };

    const updated = await this.prisma.organization.update({
      where: { id: params.orgId },
      data: {
        ...(params.patch.name !== undefined ? { name: params.patch.name } : {}),
        ...(params.patch.plan !== undefined ? { plan: params.patch.plan } : {}),
        ...(params.patch.status !== undefined ? { status: params.patch.status } : {}),
      },
    });

    const after = { id: updated.id, name: updated.name, plan: updated.plan, status: updated.status };

    await auditPlatformOrgUpdated({
      audit: this.audit,
      actor: { userId: params.actor.userId, email: params.actor.email },
      org: updated,
      before,
      after,
    });

    if (before.status !== after.status) {
      if (after.status === 'suspended') {
        await auditOrgSuspended({
          audit: this.audit,
          actor: { userId: params.actor.userId, email: params.actor.email },
          org: updated,
          before,
          after,
        });
      } else if (after.status === 'active') {
        await auditOrgUnsuspended({
          audit: this.audit,
          actor: { userId: params.actor.userId, email: params.actor.email },
          org: updated,
          before,
          after,
        });
      }
    }

    return updated;
  }
}
