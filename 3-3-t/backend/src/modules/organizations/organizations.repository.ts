import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async assertMember(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
    });
    return Boolean(membership);
  }
}
