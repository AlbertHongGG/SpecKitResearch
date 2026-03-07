import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { assertSubOrderTransition } from '../../orders/suborder-state';
import type { CurrentUser } from '../../../auth/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser | undefined) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.subOrder.findMany({
      where: { sellerId: user.id },
      include: { items: true },
    });
  }

  async detail(user: CurrentUser | undefined, subOrderId: string) {
    if (!user) throw new UnauthorizedException('Authentication required');
    const order = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: { items: true },
    });
    if (!order || order.sellerId !== user.id)
      throw new NotFoundException('SubOrder not found');
    return order;
  }

  async ship(user: CurrentUser | undefined, subOrderId: string) {
    const subOrder = await this.detail(user, subOrderId);
    assertSubOrderTransition(subOrder.status, 'SHIPPED');
    return this.prisma.subOrder.update({
      where: { id: subOrder.id },
      data: { status: 'SHIPPED' },
    });
  }
}
