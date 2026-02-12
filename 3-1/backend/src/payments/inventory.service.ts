import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async decrementStock(
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const result = await db.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (result.count !== 1) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Insufficient stock' });
    }
  }
}
