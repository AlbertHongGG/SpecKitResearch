import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';

type ProductStatus = 'draft' | 'active' | 'inactive' | 'banned';

@Injectable()
export class SellerProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProduct(sellerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return null;
    if (product.sellerId !== sellerId) return null;
    return product;
  }

  async listMyProducts(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createProduct(sellerId: string, params: {
    title: string;
    description: string;
    price: number;
    stock: number;
    categoryId: string;
  }) {
    return this.prisma.product.create({
      data: {
        sellerId,
        title: params.title,
        description: params.description,
        price: params.price,
        stock: params.stock,
        categoryId: params.categoryId,
        status: 'draft',
      },
    });
  }

  async updateMyProduct(sellerId: string, productId: string, patch: {
    title?: string;
    description?: string;
    price?: number;
    stock?: number;
    categoryId?: string;
    status?: ProductStatus;
  }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Product not found' });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }

    if (patch.status === 'banned') {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Only admin can ban products' });
    }

    if (patch.status) {
      const allowed: Record<ProductStatus, ProductStatus[]> = {
        draft: ['active', 'inactive', 'draft'],
        active: ['inactive', 'active'],
        inactive: ['active', 'inactive'],
        banned: ['banned'],
      };
      const current = product.status as ProductStatus;
      const ok = allowed[current]?.includes(patch.status) ?? false;
      if (!ok) {
        throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Invalid status transition' });
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        title: patch.title,
        description: patch.description,
        price: patch.price,
        stock: patch.stock,
        categoryId: patch.categoryId,
        status: patch.status,
      },
    });
  }

  async adminUpdateProduct(productId: string, patch: { status?: ProductStatus }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Product not found' });
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        status: patch.status,
      },
    });
  }
}
