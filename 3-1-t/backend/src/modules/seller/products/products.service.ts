import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { CurrentUser } from '../../../auth/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser | undefined) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.product.findMany({ where: { sellerId: user.id } });
  }

  async create(
    user: CurrentUser | undefined,
    body: {
      name: string;
      description: string;
      priceCents: number;
      stock: number;
      categoryId?: string;
    },
  ) {
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.prisma.product.create({
      data: { ...body, sellerId: user.id, status: 'DRAFT' },
    });
  }

  async update(
    user: CurrentUser | undefined,
    id: string,
    body: Partial<{
      name: string;
      description: string;
      priceCents: number;
      stock: number;
      status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    }>,
  ) {
    if (!user) throw new UnauthorizedException('Authentication required');
    const found = await this.prisma.product.findUnique({ where: { id } });
    if (!found || found.sellerId !== user.id)
      throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: body });
  }
}
