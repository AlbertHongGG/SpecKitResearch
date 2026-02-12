import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(buyerId: string) {
    await this.prisma.cart.upsert({ where: { buyerId }, update: {}, create: { buyerId } });
    const items = await this.prisma.cartItem.findMany({
      where: { buyerId },
      include: { product: true },
      orderBy: { id: 'asc' },
    });
    return items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      product: it.product,
    }));
  }

  async setItem(buyerId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'active') {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Product not found' });
    }
    if (quantity < 1) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'quantity must be >= 1' });
    }
    if (product.stock < quantity) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Insufficient stock' });
    }
    await this.prisma.cart.upsert({ where: { buyerId }, update: {}, create: { buyerId } });
    await this.prisma.cartItem.upsert({
      where: { buyerId_productId: { buyerId, productId } },
      update: { quantity },
      create: { buyerId, productId, quantity },
    });
  }

  async removeItem(buyerId: string, productId: string) {
    await this.prisma.cartItem.deleteMany({ where: { buyerId, productId } });
  }
}
