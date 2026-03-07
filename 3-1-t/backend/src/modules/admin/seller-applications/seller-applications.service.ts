import { Injectable } from '@nestjs/common';

import { AuditActions } from '../../../common/audit/audit-actions';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminSellerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.sellerApplication.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, actorId?: string) {
    const application = await this.prisma.sellerApplication.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: application.userId, role: 'SELLER' } },
      update: {},
      create: { userId: application.userId, role: 'SELLER' },
    });
    await this.audit.write({
      actorId,
      actorRole: 'ADMIN',
      action: AuditActions.SELLER_APPLICATION_DECIDE,
      targetType: 'SellerApplication',
      targetId: id,
      metadata: { decision: 'approve' },
    });
    return application;
  }

  async reject(id: string, actorId?: string) {
    const application = await this.prisma.sellerApplication.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    await this.audit.write({
      actorId,
      actorRole: 'ADMIN',
      action: AuditActions.SELLER_APPLICATION_DECIDE,
      targetType: 'SellerApplication',
      targetId: id,
      metadata: { decision: 'reject' },
    });
    return application;
  }
}
