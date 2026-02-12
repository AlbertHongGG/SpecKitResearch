import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  async categories() {
    const items = await this.prisma.category.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return { items };
  }

  @Get('products')
  async list(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const where: any = { status: 'active' };
    if (categoryId) where.categoryId = categoryId;
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }
    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items: products };
  }

  @Get('products/:productId')
  async detail(@Param('productId') productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === 'banned') {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Product not found' });
    }
    return product;
  }
}
