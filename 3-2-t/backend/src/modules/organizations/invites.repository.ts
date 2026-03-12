import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InvitesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findByToken(token: string) {
    return this.prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true },
    });
  }

  acceptInvite(inviteId: string) {
    return this.prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
    });
  }

  upsertMembership(organizationId: string, userId: string) {
    return this.prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      update: {
        orgRole: 'org_member',
        status: 'active',
      },
      create: {
        organizationId,
        userId,
        orgRole: 'org_member',
        status: 'active',
      },
    });
  }
}
