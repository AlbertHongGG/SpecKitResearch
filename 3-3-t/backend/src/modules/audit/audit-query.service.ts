import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  query(filters: {
    actorUserId?: string;
    actorRoleContext?: string;
    organizationId?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        actorUserId: filters.actorUserId,
        actorRoleContext: filters.actorRoleContext,
        organizationId: filters.organizationId,
        action: filters.action,
        createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
