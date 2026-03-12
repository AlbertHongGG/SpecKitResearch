import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  latestByOrg(organizationId: string) {
    return this.prisma.adminOverride.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(id: string) {
    return this.prisma.adminOverride.findUnique({ where: { id } });
  }

  force(organizationId: string, createdByUserId: string, forcedStatus: 'Suspended' | 'Expired', reason: string) {
    return this.prisma.adminOverride.create({
      data: { organizationId, createdByUserId, forcedStatus, reason },
    });
  }

  revoke(id: string) {
    return this.prisma.adminOverride.update({ where: { id }, data: { revokedAt: new Date(), forcedStatus: 'NONE' } });
  }
}
