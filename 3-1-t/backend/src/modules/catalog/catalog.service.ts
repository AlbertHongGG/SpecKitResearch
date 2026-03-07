import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type { ProductListQuery } from './catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ProductListQuery) {
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          ...(query.q
            ? {
                OR: [
                  { name: { contains: query.q } },
                  { description: { contains: query.q } },
                ],
              }
            : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.sellerId ? { sellerId: query.sellerId } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: query.limit,
      }),
      this.prisma.product.count({
        where: {
          status: 'ACTIVE',
          ...(query.q
            ? {
                OR: [
                  { name: { contains: query.q } },
                  { description: { contains: query.q } },
                ],
              }
            : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.sellerId ? { sellerId: query.sellerId } : {}),
        },
      }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getProductDetail(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status === 'BANNED') {
      return {
        id: product.id,
        status: product.status,
        available: false,
        message: 'Product unavailable',
      };
    }

    return {
      ...product,
      available: product.status === 'ACTIVE',
    };
  }
}
