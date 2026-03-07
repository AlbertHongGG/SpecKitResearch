import { ConflictException } from '@nestjs/common';

import { deductStockOrThrow } from '../../src/modules/catalog/stock-deduction';

describe('stock-deduction', () => {
  it('deducts stock for every item when all checks pass', async () => {
    const updateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const prisma = {
      product: {
        updateMany,
      },
    } as any;

    await expect(
      deductStockOrThrow({
        prisma,
        items: [
          { productId: 'a', quantity: 1 },
          { productId: 'b', quantity: 2 },
        ],
      }),
    ).resolves.toBeUndefined();
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it('throws conflict when stock is insufficient (oversell path)', async () => {
    const prisma = {
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;

    await expect(
      deductStockOrThrow({
        prisma,
        items: [{ productId: 'a', quantity: 999 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
