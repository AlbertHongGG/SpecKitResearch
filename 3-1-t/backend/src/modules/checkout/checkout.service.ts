import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { CurrentUser } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(user: CurrentUser | undefined) {
    if (!user) throw new UnauthorizedException('Authentication required');

    const cart = await this.prisma.cart.findUnique({
      where: { buyerId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new ConflictException('Cart is empty');
    }

    const invalidItems = cart.items.filter(
      (item) =>
        item.product.status !== 'ACTIVE' || item.product.stock < item.quantity,
    );

    if (invalidItems.length > 0) {
      throw new ConflictException({
        message: 'Some items are unavailable',
        invalidItems: invalidItems.map((item) => ({
          productId: item.productId,
          availableStock: item.product.stock,
        })),
      });
    }

    const totalCents = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.product.priceCents,
      0,
    );

    const groupedBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const list = groupedBySeller.get(item.product.sellerId) ?? [];
      list.push(item);
      groupedBySeller.set(item.product.sellerId, list);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          buyerId: user.id,
          totalCents,
          status: 'CREATED',
        },
      });

      for (const [sellerId, items] of groupedBySeller.entries()) {
        const subtotalCents = items.reduce(
          (sum, item) => sum + item.quantity * item.product.priceCents,
          0,
        );

        const subOrder = await tx.subOrder.create({
          data: {
            orderId: order.id,
            sellerId,
            status: 'PENDING_PAYMENT',
            subtotalCents,
          },
        });

        await tx.subOrderItem.createMany({
          data: items.map((item) => ({
            subOrderId: subOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: item.product.priceCents,
          })),
        });
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amountCents: totalCents,
          status: 'PENDING',
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { order, payment };
    });

    return result;
  }
}
