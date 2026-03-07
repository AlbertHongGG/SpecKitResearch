import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { CurrentUser } from '../../../auth/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(user: CurrentUser | undefined, shopName?: string) {
    if (!user) throw new UnauthorizedException('Authentication required');

    const existing = await this.prisma.sellerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.sellerApplication.update({
        where: { id: existing.id },
        data: {
          shopName: shopName ?? existing.shopName,
          status: 'SUBMITTED',
        },
      });
    }

    return this.prisma.sellerApplication.create({
      data: {
        userId: user.id,
        shopName: shopName ?? `shop-${user.id.slice(0, 8)}`,
        status: 'SUBMITTED',
      },
    });
  }

  async status(user: CurrentUser | undefined) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.sellerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
