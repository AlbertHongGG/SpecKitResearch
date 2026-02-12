import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

@Injectable()
export class SellerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: string) {
    return this.prisma.sellerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async decide(params: {
    adminUserId: string;
    applicationId: string;
    decision: 'approved' | 'rejected';
    note?: string;
  }) {
    const app = await this.prisma.sellerApplication.findUnique({ where: { id: params.applicationId } });
    if (!app) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Application not found' });

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextStatus = params.decision;
      const a = await tx.sellerApplication.update({
        where: { id: params.applicationId },
        data: {
          status: nextStatus,
          reviewedByAdminId: params.adminUserId,
        },
      });

      if (params.decision === 'approved') {
        const user = await tx.user.findUnique({ where: { id: app.userId } });
        const rawRoles = user?.roles as unknown;
        const roles = Array.isArray(rawRoles) ? rawRoles : [];
        const roleStrings = roles.filter((r): r is string => typeof r === 'string');
        const nextRoles = Array.from(new Set([...roleStrings, 'seller']));
        await tx.user.update({ where: { id: app.userId }, data: { roles: nextRoles as any } });
      }

      return a;
    });

    await this.audit.write({
      actorUserId: params.adminUserId,
      actorRole: 'admin',
      action:
        params.decision === 'approved'
          ? AuditActions.ADMIN_APPROVE_SELLER
          : AuditActions.ADMIN_REJECT_SELLER,
      targetType: 'SellerApplication',
      targetId: params.applicationId,
      metadata: { note: params.note ?? null },
    });

    return updated;
  }
}
