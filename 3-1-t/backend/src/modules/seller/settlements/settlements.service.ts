import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { CurrentUser } from '../../../auth/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser | undefined) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.settlement.findMany({ where: { sellerId: user.id } });
  }

  async detail(user: CurrentUser | undefined, settlementId: string) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.settlement.findFirst({
      where: { id: settlementId, sellerId: user.id },
    });
  }
}
