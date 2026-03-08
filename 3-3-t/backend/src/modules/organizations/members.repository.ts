import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  add(organizationId: string, userId: string, role: 'END_USER' | 'ORG_ADMIN') {
    return this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: { role, status: 'ACTIVE' },
      create: { organizationId, userId, role },
    });
  }

  updateRole(id: string, role: 'END_USER' | 'ORG_ADMIN') {
    return this.prisma.organizationMember.update({ where: { id }, data: { role } });
  }

  remove(id: string) {
    return this.prisma.organizationMember.update({ where: { id }, data: { status: 'REMOVED' } });
  }
}
