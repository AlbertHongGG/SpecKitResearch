import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { CurrentUser } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CartItemBody,
  CartItemDelete,
  CartItemUpdate,
} from './cart.schemas';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private assertBuyer(
    user: CurrentUser | undefined,
  ): asserts user is CurrentUser {
    if (!user) throw new UnauthorizedException('Authentication required');
  }

  async getCart(user: CurrentUser | undefined) {
    this.assertBuyer(user);

    const cart = await this.prisma.cart.upsert({
      where: { buyerId: user.id },
      update: {},
      create: { buyerId: user.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return cart;
  }

  async addItem(user: CurrentUser | undefined, body: CartItemBody) {
    this.assertBuyer(user);
    const product = await this.prisma.product.findUnique({
      where: { id: body.productId },
    });
    if (
      !product ||
      product.status !== 'ACTIVE' ||
      product.stock < body.quantity
    ) {
      throw new ConflictException('Product unavailable or insufficient stock');
    }

    const cart = await this.prisma.cart.upsert({
      where: { buyerId: user.id },
      update: {},
      create: { buyerId: user.id },
    });

    return this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: body.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: body.productId,
        quantity: body.quantity,
      },
      update: {
        quantity: { increment: body.quantity },
      },
    });
  }

  async updateItem(user: CurrentUser | undefined, body: CartItemUpdate) {
    this.assertBuyer(user);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: body.itemId },
      include: { cart: true },
    });
    if (!item || item.cart.buyerId !== user.id)
      throw new NotFoundException('Cart item not found');

    return this.prisma.cartItem.update({
      where: { id: body.itemId },
      data: { quantity: body.quantity },
    });
  }

  async removeItem(user: CurrentUser | undefined, body: CartItemDelete) {
    this.assertBuyer(user);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: body.itemId },
      include: { cart: true },
    });
    if (!item || item.cart.buyerId !== user.id)
      throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: body.itemId } });
    return { ok: true };
  }
}
