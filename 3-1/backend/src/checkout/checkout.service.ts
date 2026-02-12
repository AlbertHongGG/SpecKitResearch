import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { sumMoney } from '../shared/money/money';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(buyerId: string, paymentMethod: string, transactionId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { buyerId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Cart is empty' });
    }

    for (const it of cartItems) {
      if (it.product.status !== 'active') {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Inactive product in cart' });
      }
      if (it.quantity < 1) {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Invalid quantity' });
      }
      if (it.product.stock < it.quantity) {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Insufficient stock' });
      }
    }

    const grouped = new Map<string, typeof cartItems>();
    for (const it of cartItems) {
      const sellerId = it.product.sellerId;
      grouped.set(sellerId, [...(grouped.get(sellerId) ?? []), it]);
    }

    const total = sumMoney(cartItems.map((it) => it.product.price * it.quantity));

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          buyerId,
          totalAmount: total,
          status: 'created',
        },
      });

      for (const [sellerId, items] of grouped.entries()) {
        const subtotal = sumMoney(items.map((it) => it.product.price * it.quantity));
        const sub = await tx.subOrder.create({
          data: {
            orderId: order.id,
            sellerId,
            subtotal,
            status: 'pending_payment',
          },
        });
        await tx.subOrderItem.createMany({
          data: items.map((it) => ({
            subOrderId: sub.id,
            productId: it.productId,
            unitPriceSnapshot: it.product.price,
            quantity: it.quantity,
          })),
        });
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod,
          paymentStatus: 'pending',
          transactionId,
        },
      });

      await tx.cartItem.deleteMany({ where: { buyerId } });

      return { orderId: order.id };
    });
  }
}
