import { ConflictException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type StockDeductionItem = {
  productId: string;
  quantity: number;
};

export async function deductStockOrThrow(params: {
  prisma: PrismaService;
  items: StockDeductionItem[];
}) {
  for (const item of params.items) {
    const updated = await params.prisma.product.updateMany({
      where: {
        id: item.productId,
        status: 'ACTIVE',
        stock: {
          gte: item.quantity,
        },
      },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException('Insufficient stock');
    }
  }
}
